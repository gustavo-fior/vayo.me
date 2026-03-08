"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import type { CanvasAssetType } from "./asset-card";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  CircleCheckIcon,
  CopyIcon,
  ExternalLink,
  FolderOpenIcon,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../ui/context-menu";
import type { Folder } from "@/app/bookmarks/page";

const MIN_SIZE = 50;
const DEFAULT_ASSET_WIDTH = 300;

function useNaturalDimensions(assets: CanvasAssetType[]) {
  const [dimensions, setDimensions] = useState<
    Map<string, { width: number; height: number }>
  >(new Map());
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const asset of assets) {
      if (asset.canvasWidth != null && asset.canvasHeight != null) continue;
      if (loadedRef.current.has(asset.id)) continue;
      loadedRef.current.add(asset.id);

      if (asset.assetType === "video") {
        const video = document.createElement("video");
        video.src = asset.url;
        video.onloadedmetadata = () => {
          setDimensions((prev) => {
            const next = new Map(prev);
            next.set(asset.id, {
              width: video.videoWidth,
              height: video.videoHeight,
            });
            return next;
          });
        };
      } else {
        const img = new Image();
        img.src = asset.url;
        img.onload = () => {
          setDimensions((prev) => {
            const next = new Map(prev);
            next.set(asset.id, {
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
            return next;
          });
        };
      }
    }
  }, [assets]);

  return dimensions;
}

export function CanvasView({
  assets,
  folderId,
  folders = [],
  onDelete,
  onMove,
  onUpdateZIndex,
  onPreview,
}: {
  assets: CanvasAssetType[];
  folderId?: string;
  folders?: Folder[];
  onDelete?: (id: string) => void;
  onMove?: (assetId: string, folderId: string) => void;
  onUpdateZIndex?: (
    updates: Array<{ id: string; canvasZIndex: number }>
  ) => void;
  onPreview?: (asset: CanvasAssetType) => void;
}) {
  const canvasFolders = folders.filter(
    (f) => f.type === "canvas" && f.id !== folderId
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasLayerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const translateStartRef = useRef({ x: 0, y: 0 });
  const pendingUpdatesRef = useRef<
    Map<
      string,
      {
        canvasX: number;
        canvasY: number;
        canvasWidth: number;
        canvasHeight: number;
      }
    >
  >(new Map());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const naturalDimensions = useNaturalDimensions(assets);
  const localPositionsRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const prevAssetIdsRef = useRef<string[]>([]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Marquee state
  const isMarqueeRef = useRef(false);
  const marqueeStartRef = useRef({ x: 0, y: 0 });
  const [marqueeRect, setMarqueeRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Per-asset drag-moved tracking for click vs drag distinction
  const dragMovedRef = useRef<Map<string, boolean>>(new Map());

  // Multi-drag state
  const multiDragLeaderRef = useRef<string | null>(null);
  const multiDragStartPositionsRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const [renderTick, setRenderTick] = useState(0);

  // Migrate local positions when asset IDs change (temp ID → real DB ID swap)
  useEffect(() => {
    const prevIds = prevAssetIdsRef.current;
    const currentIds = assets.map((a) => a.id);

    if (prevIds.length > 0 && prevIds.length === currentIds.length) {
      const prevSet = new Set(prevIds);
      const currentSet = new Set(currentIds);
      const removed = prevIds.filter((id) => !currentSet.has(id));
      const added = currentIds.filter((id) => !prevSet.has(id));

      if (removed.length === 1 && added.length === 1) {
        const pos = localPositionsRef.current.get(removed[0]);
        if (pos) {
          localPositionsRef.current.set(added[0], pos);
          localPositionsRef.current.delete(removed[0]);
        }
        // Migrate selection too
        if (selectedIdsRef.current.has(removed[0])) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(removed[0]);
            next.add(added[0]);
            return next;
          });
        }
      }
    }

    prevAssetIdsRef.current = currentIds;
  }, [assets]);

  const batchUpdate = useMutation(
    trpc.canvasAssets.batchUpdatePositions.mutationOptions({})
  );

  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;
    const updates = Array.from(pendingUpdatesRef.current.entries()).map(
      ([id, pos]) => ({ id, ...pos })
    );
    pendingUpdatesRef.current.clear();
    batchUpdate.mutate(updates);
  }, [batchUpdate]);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushUpdates, 1000);
  }, [flushUpdates]);

  // Auto-layout for assets without canvas coordinates
  const getAssetPosition = useCallback(
    (asset: CanvasAssetType, index: number) => {
      const local = localPositionsRef.current.get(asset.id);
      if (local) return local;

      if (
        asset.canvasX != null &&
        asset.canvasY != null &&
        asset.canvasWidth != null &&
        asset.canvasHeight != null
      ) {
        return {
          x: asset.canvasX,
          y: asset.canvasY,
          width: asset.canvasWidth,
          height: asset.canvasHeight,
        };
      }

      const natural = naturalDimensions.get(asset.id);
      const w = DEFAULT_ASSET_WIDTH;
      const h = natural ? Math.round(w * (natural.height / natural.width)) : w;

      const cols = 4;
      const gap = 20;
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        x: col * (w + gap) + gap,
        y: row * (h + gap) + gap,
        width: w,
        height: h,
      };
    },
    [naturalDimensions]
  );

  // Zoom with wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.min(3, Math.max(0.1, scale * delta));
      const scaleChange = newScale / scale;

      setTranslate((prev) => ({
        x: mouseX - scaleChange * (mouseX - prev.x),
        y: mouseY - scaleChange * (mouseY - prev.y),
      }));
      setScale(newScale);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [scale]);

  // Pan + marquee with mouse drag on background
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target !== el && target !== canvasLayerRef.current) return;

      if (e.shiftKey) {
        // Start marquee
        isMarqueeRef.current = true;
        marqueeStartRef.current = { x: e.clientX, y: e.clientY };
        setMarqueeRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
        el.style.cursor = "crosshair";
      } else {
        // Pan — also clear selection
        setSelectedIds(new Set());
        isPanningRef.current = true;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        translateStartRef.current = { ...translate };
        el.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMarqueeRef.current) {
        const sx = marqueeStartRef.current.x;
        const sy = marqueeStartRef.current.y;
        const cx = e.clientX;
        const cy = e.clientY;
        const rect = {
          x: Math.min(sx, cx),
          y: Math.min(sy, cy),
          width: Math.abs(cx - sx),
          height: Math.abs(cy - sy),
        };
        setMarqueeRect(rect);

        // Live highlight: compute selection during drag
        if (rect.width > 3 || rect.height > 3) {
          const containerRect = el.getBoundingClientRect();
          const toCanvas = (screenX: number, screenY: number) => ({
            x: (screenX - containerRect.left - translate.x) / scale,
            y: (screenY - containerRect.top - translate.y) / scale,
          });
          const topLeft = toCanvas(rect.x, rect.y);
          const bottomRight = toCanvas(rect.x + rect.width, rect.y + rect.height);
          const marqueeCanvas = {
            x: topLeft.x,
            y: topLeft.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
          };
          const newSelected = new Set<string>();
          assets.forEach((asset, index) => {
            const pos = getAssetPosition(asset, index);
            if (
              pos.x < marqueeCanvas.x + marqueeCanvas.width &&
              pos.x + pos.width > marqueeCanvas.x &&
              pos.y < marqueeCanvas.y + marqueeCanvas.height &&
              pos.y + pos.height > marqueeCanvas.y
            ) {
              newSelected.add(asset.id);
            }
          });
          setSelectedIds(newSelected);
        }
        return;
      }
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTranslate({
        x: translateStartRef.current.x + dx,
        y: translateStartRef.current.y + dy,
      });
    };

    const handleMouseUp = () => {
      if (isMarqueeRef.current) {
        isMarqueeRef.current = false;
        el.style.cursor = "grab";
        setMarqueeRect(null);
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        el.style.cursor = "grab";
      }
    };

    el.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      el.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [translate, scale, assets, getAssetPosition]);

  // Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{
        height: "100%",
        cursor: "grab",
      }}
    >
      <div
        ref={canvasLayerRef}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          width: "10000px",
          height: "10000px",
        }}
      >
        {assets.map((asset, index) => {
          const pos = getAssetPosition(asset, index);
          const isSelected = selectedIds.has(asset.id);
          const isFollower =
            multiDragLeaderRef.current !== null &&
            multiDragLeaderRef.current !== asset.id &&
            isSelected;

          return (
            <Rnd
              key={asset.id}
              style={{
                zIndex: asset.canvasZIndex,
                outline: isSelected ? "2px solid var(--primary)" : undefined,
                outlineOffset: isSelected ? "2px" : undefined,
              }}
              position={isFollower ? { x: pos.x, y: pos.y } : undefined}
              size={
                isFollower
                  ? { width: pos.width, height: pos.height }
                  : undefined
              }
              default={{
                x: pos.x,
                y: pos.y,
                width: pos.width,
                height: pos.height,
              }}
              minWidth={MIN_SIZE}
              minHeight={MIN_SIZE}
              lockAspectRatio
              scale={scale}
              onMouseDown={(e: MouseEvent) => {
                if (e.shiftKey) {
                  // Toggle selection
                  e.stopPropagation();
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(asset.id)) {
                      next.delete(asset.id);
                    } else {
                      next.add(asset.id);
                    }
                    return next;
                  });
                } else if (!selectedIdsRef.current.has(asset.id)) {
                  // Click on unselected asset → select only it
                  setSelectedIds(new Set([asset.id]));
                }
              }}
              onDragStart={(_e, _d) => {
                dragMovedRef.current.set(asset.id, false);
                const sel = selectedIdsRef.current;
                if (sel.has(asset.id) && sel.size > 1) {
                  // This asset is the drag leader
                  multiDragLeaderRef.current = asset.id;
                  // Snapshot all selected positions
                  const snapshot = new Map<
                    string,
                    { x: number; y: number; width: number; height: number }
                  >();
                  assets.forEach((a, i) => {
                    if (sel.has(a.id)) {
                      snapshot.set(a.id, { ...getAssetPosition(a, i) });
                    }
                  });
                  multiDragStartPositionsRef.current = snapshot;
                } else {
                  multiDragLeaderRef.current = null;
                }
              }}
              onDrag={(_e, d) => {
                dragMovedRef.current.set(asset.id, true);
                if (multiDragLeaderRef.current !== asset.id) return;
                const startPos = multiDragStartPositionsRef.current.get(
                  asset.id
                );
                if (!startPos) return;

                const dx = d.x - startPos.x;
                const dy = d.y - startPos.y;

                // Move all followers
                multiDragStartPositionsRef.current.forEach((origPos, id) => {
                  if (id === asset.id) return; // leader is moved by Rnd
                  localPositionsRef.current.set(id, {
                    x: origPos.x + dx,
                    y: origPos.y + dy,
                    width: origPos.width,
                    height: origPos.height,
                  });
                });
                setRenderTick((t) => t + 1);
              }}
              onDragStop={(_e, d) => {
                if (multiDragLeaderRef.current === asset.id) {
                  // Persist leader
                  const leaderStart = multiDragStartPositionsRef.current.get(
                    asset.id
                  );
                  if (leaderStart) {
                    const dx = d.x - leaderStart.x;
                    const dy = d.y - leaderStart.y;

                    // Persist leader
                    localPositionsRef.current.set(asset.id, {
                      x: d.x,
                      y: d.y,
                      width: leaderStart.width,
                      height: leaderStart.height,
                    });
                    pendingUpdatesRef.current.set(asset.id, {
                      canvasX: d.x,
                      canvasY: d.y,
                      canvasWidth: leaderStart.width,
                      canvasHeight: leaderStart.height,
                    });

                    // Persist followers
                    multiDragStartPositionsRef.current.forEach(
                      (origPos, id) => {
                        if (id === asset.id) return;
                        const newPos = {
                          x: origPos.x + dx,
                          y: origPos.y + dy,
                          width: origPos.width,
                          height: origPos.height,
                        };
                        localPositionsRef.current.set(id, newPos);
                        pendingUpdatesRef.current.set(id, {
                          canvasX: newPos.x,
                          canvasY: newPos.y,
                          canvasWidth: newPos.width,
                          canvasHeight: newPos.height,
                        });
                      }
                    );
                  }

                  multiDragLeaderRef.current = null;
                  multiDragStartPositionsRef.current.clear();
                  scheduleFlush();
                } else {
                  // Single asset drag
                  const updated = {
                    x: d.x,
                    y: d.y,
                    width: pos.width,
                    height: pos.height,
                  };
                  localPositionsRef.current.set(asset.id, updated);
                  pendingUpdatesRef.current.set(asset.id, {
                    canvasX: d.x,
                    canvasY: d.y,
                    canvasWidth: pos.width,
                    canvasHeight: pos.height,
                  });
                  scheduleFlush();
                }
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                const w = parseFloat(ref.style.width);
                const h = parseFloat(ref.style.height);
                const updated = {
                  x: position.x,
                  y: position.y,
                  width: w,
                  height: h,
                };
                localPositionsRef.current.set(asset.id, updated);
                pendingUpdatesRef.current.set(asset.id, {
                  canvasX: position.x,
                  canvasY: position.y,
                  canvasWidth: w,
                  canvasHeight: h,
                });
                scheduleFlush();
              }}
              className="group"
            >
              <ContextMenu>
                <ContextMenuTrigger className="w-full h-full">
                  <div
                    className="w-full h-full rounded-md overflow-hidden group-hover:border-primary/40 transition-colors shadow-sm cursor-pointer"
                    onClick={(e) => {
                      if (!dragMovedRef.current.get(asset.id) && !e.shiftKey) {
                        onPreview?.(asset);
                      }
                    }}
                  >
                    {asset.assetType === "video" ? (
                      <video
                        src={asset.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.originalFilename || "Asset"}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                      />
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-44">
                  {onUpdateZIndex && (
                    <>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        disabled={asset._temp}
                        onClick={() => {
                          const maxZ = Math.max(
                            ...assets.map((a) => a.canvasZIndex)
                          );
                          if (asset.canvasZIndex < maxZ) {
                            onUpdateZIndex([
                              { id: asset.id, canvasZIndex: maxZ + 1 },
                            ]);
                          }
                        }}
                      >
                        <ArrowUpFromLine className="size-3.5 text-neutral-500 stroke-[1.5]" />
                        Bring to Front
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        disabled={asset._temp}
                        onClick={() => {
                          const sorted = [...assets].sort(
                            (a, b) => a.canvasZIndex - b.canvasZIndex
                          );
                          const idx = sorted.findIndex(
                            (a) => a.id === asset.id
                          );
                          if (idx < sorted.length - 1) {
                            const next = sorted[idx + 1];
                            if (next.canvasZIndex === asset.canvasZIndex) {
                              onUpdateZIndex([
                                {
                                  id: asset.id,
                                  canvasZIndex: asset.canvasZIndex + 1,
                                },
                              ]);
                            } else {
                              onUpdateZIndex([
                                {
                                  id: asset.id,
                                  canvasZIndex: next.canvasZIndex,
                                },
                                {
                                  id: next.id,
                                  canvasZIndex: asset.canvasZIndex,
                                },
                              ]);
                            }
                          }
                        }}
                      >
                        <ChevronUp className="size-3.5 text-neutral-500 stroke-[1.5]" />
                        Bring Forward
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        disabled={asset._temp}
                        onClick={() => {
                          const sorted = [...assets].sort(
                            (a, b) => a.canvasZIndex - b.canvasZIndex
                          );
                          const idx = sorted.findIndex(
                            (a) => a.id === asset.id
                          );
                          if (idx > 0) {
                            const prev = sorted[idx - 1];
                            if (prev.canvasZIndex === asset.canvasZIndex) {
                              onUpdateZIndex([
                                {
                                  id: asset.id,
                                  canvasZIndex: asset.canvasZIndex - 1,
                                },
                              ]);
                            } else {
                              onUpdateZIndex([
                                {
                                  id: asset.id,
                                  canvasZIndex: prev.canvasZIndex,
                                },
                                {
                                  id: prev.id,
                                  canvasZIndex: asset.canvasZIndex,
                                },
                              ]);
                            }
                          }
                        }}
                      >
                        <ChevronDown className="size-3.5 text-neutral-500 stroke-[1.5]" />
                        Send Backward
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        disabled={asset._temp}
                        onClick={() => {
                          const minZ = Math.min(
                            ...assets.map((a) => a.canvasZIndex)
                          );
                          if (asset.canvasZIndex > minZ) {
                            onUpdateZIndex([
                              { id: asset.id, canvasZIndex: minZ - 1 },
                            ]);
                          }
                        }}
                      >
                        <ArrowDownToLine className="size-3.5 text-neutral-500 stroke-[1.5]" />
                        Send to Back
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  )}
                  <ContextMenuItem
                    className="flex items-center gap-2"
                    onClick={() => window.open(asset.url, "_blank")}
                  >
                    <ExternalLink className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                    Open in new tab
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    className="flex items-center gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(asset.url);
                      toast.custom(() => (
                        <div className="flex justify-center mx-auto">
                          <div className="bg-popover text-popover-foreground border border-input/50 rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
                            <CircleCheckIcon
                              className="size-3.5 text-green-400 dark:text-green-600"
                              strokeWidth={2.2}
                            />
                            <h1>URL copied to clipboard</h1>
                          </div>
                        </div>
                      ), { position: "top-center" });
                    }}
                  >
                    <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                    Copy URL
                  </ContextMenuItem>
                  {asset.assetType === "image" && (
                    <ContextMenuItem
                      className="flex items-center gap-2"
                      onClick={async () => {
                        try {
                          const res = await fetch(asset.url);
                          const blob = await res.blob();
                          const pngBlob = blob.type === "image/png" ? blob : await new Promise<Blob>((resolve) => {
                            const img = new window.Image();
                            img.crossOrigin = "anonymous";
                            img.onload = () => {
                              const canvas = document.createElement("canvas");
                              canvas.width = img.naturalWidth;
                              canvas.height = img.naturalHeight;
                              canvas.getContext("2d")!.drawImage(img, 0, 0);
                              canvas.toBlob((b) => resolve(b!), "image/png");
                            };
                            img.src = asset.url;
                          });
                          await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
                          toast.custom(() => (
                            <div className="flex justify-center mx-auto">
                              <div className="bg-popover text-popover-foreground border border-input/50 rounded-full px-3 pr-4 py-2 text-sm font-medium flex items-center gap-2.5">
                                <CircleCheckIcon className="size-3.5 text-green-400 dark:text-green-600" strokeWidth={2.2} />
                                <h1>Image copied to clipboard</h1>
                              </div>
                            </div>
                          ), { position: "top-center" });
                        } catch {
                          toast.error("Failed to copy image");
                        }
                      }}
                    >
                      <ImageIcon className="size-3.5 text-neutral-500 stroke-[1.5]" />
                      Copy Image
                    </ContextMenuItem>
                  )}
                  {onMove && canvasFolders.length > 0 && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuSub>
                        <ContextMenuSubTrigger
                          inset
                          className="justify-start cursor-pointer"
                        >
                          <FolderOpenIcon className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20 mr-2" />
                          Move
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-44">
                          {canvasFolders.map((folder, index) => (
                            <div key={folder.id}>
                              <ContextMenuItem
                                onClick={() => onMove(asset.id, folder.id)}
                              >
                                {folder.icon && <span>{folder.icon}</span>}
                                {folder.name}
                              </ContextMenuItem>
                              {index !== canvasFolders.length - 1 && (
                                <ContextMenuSeparator />
                              )}
                            </div>
                          ))}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    </>
                  )}
                  {onDelete && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="flex items-center gap-2 hover:text-destructive focus:text-destructive group"
                        disabled={asset._temp}
                        onClick={() => onDelete(asset.id)}
                      >
                        <Trash2 className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20 group-hover:text-destructive/20 group-focus:text-destructive" />
                        Delete
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            </Rnd>
          );
        })}
      </div>

      {/* Marquee selection overlay */}
      {marqueeRect && (
        <div
          style={{
            position: "absolute",
            left:
              marqueeRect.x -
              (containerRef.current?.getBoundingClientRect().left ?? 0),
            top:
              marqueeRect.y -
              (containerRef.current?.getBoundingClientRect().top ?? 0),
            width: marqueeRect.width,
            height: marqueeRect.height,
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="border border-primary/40 bg-primary/10 rounded-sm"
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-popover backdrop-blur-sm text-popover-foreground text-xs px-2.5 py-1 rounded-sm border border-border tabular-nums">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
