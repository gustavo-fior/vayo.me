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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../ui/context-menu";

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
  onDelete,
  onUpdateZIndex,
}: {
  assets: CanvasAssetType[];
  onDelete?: (id: string) => void;
  onUpdateZIndex?: (
    updates: Array<{ id: string; canvasZIndex: number }>
  ) => void;
}) {
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
  // Local positions from drag/resize — takes priority over everything
  const localPositionsRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const prevAssetIdsRef = useRef<string[]>([]);

  // Migrate local positions when asset IDs change (temp ID → real DB ID swap)
  useEffect(() => {
    const prevIds = prevAssetIdsRef.current;
    const currentIds = assets.map((a) => a.id);

    if (prevIds.length > 0 && prevIds.length === currentIds.length) {
      const prevSet = new Set(prevIds);
      const currentSet = new Set(currentIds);
      const removed = prevIds.filter((id) => !currentSet.has(id));
      const added = currentIds.filter((id) => !prevSet.has(id));

      // If exactly one ID was swapped, migrate its local position
      if (removed.length === 1 && added.length === 1) {
        const pos = localPositionsRef.current.get(removed[0]);
        if (pos) {
          localPositionsRef.current.set(added[0], pos);
          localPositionsRef.current.delete(removed[0]);
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

      // Zoom towards cursor
      setTranslate((prev) => ({
        x: mouseX - scaleChange * (mouseX - prev.x),
        y: mouseY - scaleChange * (mouseY - prev.y),
      }));
      setScale(newScale);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [scale]);

  // Pan with mouse drag on background
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Only start panning if clicking on the container or canvas layer background
      const target = e.target as HTMLElement;
      if (target !== el && target !== canvasLayerRef.current) return;

      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      translateStartRef.current = { ...translate };
      el.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setTranslate({
        x: translateStartRef.current.x + dx,
        y: translateStartRef.current.y + dy,
      });
    };

    const handleMouseUp = () => {
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
  }, [translate]);

  // Auto-layout for assets without canvas coordinates
  const getAssetPosition = (asset: CanvasAssetType, index: number) => {
    // Local drag/resize position takes priority (prevents remount flicker)
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
  };

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
          return (
            <Rnd
              key={`${asset.id}-${pos.width}-${pos.height}`}
              style={{ zIndex: asset.canvasZIndex }}
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
              onDragStop={(_e, d) => {
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
                  <div className="w-full h-full rounded-md overflow-hidden group-hover:border-primary/40 transition-colors shadow-sm">
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
                      ));
                    }}
                  >
                    <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                    Copy URL
                  </ContextMenuItem>
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

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-popover backdrop-blur-sm text-popover-foreground text-xs px-2.5 py-1 rounded-sm border border-border tabular-nums">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
