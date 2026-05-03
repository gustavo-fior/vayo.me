"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { AssetMedia } from "./asset-media";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronUp,
  CopyIcon,
  ExternalLink,
  FolderOpenIcon,
  Globe,
  ImageIcon,
  Palette,
  Trash2,
} from "lucide-react";
import { errorToast, successToast } from "@/utils/toast";
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
import type { FolderRecord, ItemRecord } from "@/types/items";
import { getCanvasNodeSize, getItemDomain } from "@/utils/item-display";
import { getGoogleFavicon } from "@/utils/google-favicon";
import { getPlaceholderColor } from "@/utils/placeholder-color";
import { isMediaItem } from "@/types/items";
import { isValidURL } from "@/utils/url-validator";

const MIN_SIZE = 50;
const AUTO_LAYOUT_COLUMNS = 4;
const AUTO_LAYOUT_GAP = 24;

function useNaturalDimensions(items: ItemRecord[]) {
  const [dimensions, setDimensions] = useState<
    Map<string, { width: number; height: number }>
  >(new Map());
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const item of items) {
      if (!isMediaItem(item)) continue;
      if (item.canvasWidth != null && item.canvasHeight != null) continue;
      if (loadedRef.current.has(item.id)) continue;
      loadedRef.current.add(item.id);

      if (item.type === "video") {
        const video = document.createElement("video");
        video.src = item.url ?? "";
        video.onloadedmetadata = () => {
          setDimensions((prev) => {
            const next = new Map(prev);
            next.set(item.id, {
              width: video.videoWidth,
              height: video.videoHeight,
            });
            return next;
          });
        };
      } else {
        const image = new window.Image();
        image.src = item.url ?? "";
        image.onload = () => {
          setDimensions((prev) => {
            const next = new Map(prev);
            next.set(item.id, {
              width: image.naturalWidth,
              height: image.naturalHeight,
            });
            return next;
          });
        };
      }
    }
  }, [items]);

  return dimensions;
}

function copyItemValue(item: ItemRecord) {
  navigator.clipboard.writeText(
    item.type === "color" ? item.color ?? "" : item.url ?? ""
  );
  successToast(
    item.type === "color"
      ? "Color copied to clipboard"
      : "URL copied to clipboard"
  );
}

function CanvasLinkCard({
  item,
  rounded,
}: {
  item: ItemRecord;
  rounded: boolean;
}) {
  const domain = getItemDomain(item.url);
  const [hasOgImage, setHasOgImage] = useState(
    Boolean(item.ogImageUrl && isValidURL(item.ogImageUrl))
  );

  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden ${
        rounded ? "rounded-md" : "rounded-none"
      }`}
    >
      <div
        className="relative min-h-0 flex-1 overflow-hidden bg-muted/30"
        style={
          hasOgImage
            ? undefined
            : { backgroundColor: getPlaceholderColor(item.id) }
        }
      >
        {hasOgImage && (
          <Image
            src={item.ogImageUrl ?? ""}
            alt=""
            fill
            className="object-cover"
            unoptimized
            onError={() => setHasOgImage(false)}
          />
        )}
      </div>
      <div className="flex items-start gap-3 p-3">
        {item.faviconUrl && item.url ? (
          <Image
            src={getGoogleFavicon(item.url)}
            alt=""
            width={16}
            height={16}
            className="mt-[5px] size-4 rounded-xs"
            unoptimized
          />
        ) : (
          <Globe className="mt-[5px] size-4 text-muted-foreground/60" />
        )}
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {domain}
          </p>
        </div>
      </div>
    </div>
  );
}

function CanvasColorCard({
  item,
  rounded,
}: {
  item: ItemRecord;
  rounded: boolean;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden bg-card ${
        rounded ? "rounded-md" : "rounded-none"
      }`}
    >
      <div
        className="flex-1"
        style={{ backgroundColor: item.color ?? "#e5e5e5" }}
      />
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium uppercase">{item.title}</p>
        <p className="truncate text-[11px] lowercase text-muted-foreground/70">
          {item.color}
        </p>
      </div>
    </div>
  );
}

export function CanvasView({
  assets,
  folderId,
  folders = [],
  rounded = true,
  onDelete,
  onMove,
  onUpdateZIndex,
  onPreview,
  pendingAssetIds,
  isPublic = false,
}: {
  assets: ItemRecord[];
  folderId?: string;
  folders?: FolderRecord[];
  rounded?: boolean;
  onDelete?: (asset: ItemRecord) => void;
  onMove?: (asset: ItemRecord, folderId: string) => void;
  onUpdateZIndex?: (
    updates: Array<{ id: string; canvasZIndex: number }>
  ) => void;
  onPreview?: (asset: ItemRecord) => void;
  pendingAssetIds?: Set<string>;
  isPublic?: boolean;
}) {
  const availableFolders = folders.filter((f) => f.id !== folderId);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasLayerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const scaleSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const isMarqueeRef = useRef(false);
  const marqueeStartRef = useRef({ x: 0, y: 0 });
  const marqueeRectRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const marqueeDivRef = useRef<HTMLDivElement>(null);
  const marqueeRafRef = useRef<number | null>(null);
  const marqueeLatestEventRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef<Map<string, boolean>>(new Map());
  const multiDragLeaderRef = useRef<string | null>(null);
  const multiDragStartPositionsRef = useRef<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const rndRefs = useRef<Map<string, Rnd>>(new Map());

  const applyTransform = () => {
    const layer = canvasLayerRef.current;
    if (!layer) return;
    const t = translateRef.current;
    layer.style.transform = `translate(${t.x}px, ${t.y}px) scale(${scaleRef.current})`;
  };

  const scheduleScaleSync = () => {
    if (scaleSyncTimerRef.current) clearTimeout(scaleSyncTimerRef.current);
    scaleSyncTimerRef.current = setTimeout(() => {
      scaleSyncTimerRef.current = null;
      setScale(scaleRef.current);
    }, 100);
  };

  const applyMarqueeStyle = () => {
    const div = marqueeDivRef.current;
    if (!div) return;
    const rect = marqueeRectRef.current;
    const containerEl = containerRef.current;
    if (!rect || !containerEl) {
      div.style.display = "none";
      return;
    }
    const containerRect = containerEl.getBoundingClientRect();
    div.style.display = "block";
    div.style.left = `${rect.x - containerRect.left}px`;
    div.style.top = `${rect.y - containerRect.top}px`;
    div.style.width = `${rect.width}px`;
    div.style.height = `${rect.height}px`;
  };

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    const prevIds = prevAssetIdsRef.current;
    const currentIds = assets.map((item) => item.id);

    if (prevIds.length > 0 && prevIds.length === currentIds.length) {
      const prevSet = new Set(prevIds);
      const currentSet = new Set(currentIds);
      const removed = prevIds.filter((id) => !currentSet.has(id));
      const added = currentIds.filter((id) => !prevSet.has(id));

      if (removed.length === 1 && added.length === 1) {
        const position = localPositionsRef.current.get(removed[0]);
        if (position) {
          localPositionsRef.current.set(added[0], position);
          localPositionsRef.current.delete(removed[0]);
        }

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
    trpc.items.batchUpdateCanvasLayout.mutationOptions({})
  );

  const flushUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;
    const updates = Array.from(pendingUpdatesRef.current.entries()).map(
      ([id, pos]) => ({
        id,
        ...pos,
      })
    );
    pendingUpdatesRef.current.clear();
    batchUpdate.mutate(updates);
  }, [batchUpdate]);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(flushUpdates, 1000);
  }, [flushUpdates]);

  const getAssetPosition = useCallback(
    (asset: ItemRecord, index: number) => {
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

      const defaultSize = getCanvasNodeSize(asset);

      if (isMediaItem(asset)) {
        const natural = naturalDimensions.get(asset.id);
        const width = defaultSize.width;
        const height = natural
          ? Math.round(width * (natural.height / natural.width))
          : width;
        const col = index % AUTO_LAYOUT_COLUMNS;
        const row = Math.floor(index / AUTO_LAYOUT_COLUMNS);

        return {
          x: col * (width + AUTO_LAYOUT_GAP) + AUTO_LAYOUT_GAP,
          y: row * (height + AUTO_LAYOUT_GAP) + AUTO_LAYOUT_GAP,
          width,
          height,
        };
      }

      const col = index % AUTO_LAYOUT_COLUMNS;
      const row = Math.floor(index / AUTO_LAYOUT_COLUMNS);
      return {
        x: col * (defaultSize.width + AUTO_LAYOUT_GAP) + AUTO_LAYOUT_GAP,
        y: row * (defaultSize.height + AUTO_LAYOUT_GAP) + AUTO_LAYOUT_GAP,
        width: defaultSize.width,
        height: defaultSize.height,
      };
    },
    [naturalDimensions]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      if (event.ctrlKey || event.metaKey) {
        const rect = element.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const delta = event.deltaY > 0 ? 0.9 : 1.1;
        const currentScale = scaleRef.current;
        const newScale = Math.min(3, Math.max(0.1, currentScale * delta));
        const scaleChange = newScale / currentScale;

        translateRef.current = {
          x: mouseX - scaleChange * (mouseX - translateRef.current.x),
          y: mouseY - scaleChange * (mouseY - translateRef.current.y),
        };
        scaleRef.current = newScale;
        applyTransform();
        scheduleScaleSync();
        return;
      }

      translateRef.current = {
        x: translateRef.current.x - event.deltaX,
        y: translateRef.current.y - event.deltaY,
      };
      applyTransform();
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key === "=" || event.key === "+") {
        event.preventDefault();
        scaleRef.current = Math.min(3, scaleRef.current * 1.1);
        applyTransform();
        scheduleScaleSync();
      } else if (event.key === "-") {
        event.preventDefault();
        scaleRef.current = Math.max(0.1, scaleRef.current * 0.9);
        applyTransform();
        scheduleScaleSync();
      } else if (event.key === "0") {
        event.preventDefault();
        scaleRef.current = 1;
        translateRef.current = { x: 0, y: 0 };
        applyTransform();
        scheduleScaleSync();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || isPublic) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target !== element && target !== canvasLayerRef.current) return;

      if (event.shiftKey) {
        isMarqueeRef.current = true;
        marqueeStartRef.current = { x: event.clientX, y: event.clientY };
        marqueeRectRef.current = {
          x: event.clientX,
          y: event.clientY,
          width: 0,
          height: 0,
        };
        applyMarqueeStyle();
        element.style.cursor = "crosshair";
        return;
      }

      setSelectedIds(new Set());
      isPanningRef.current = true;
      panStartRef.current = { x: event.clientX, y: event.clientY };
      translateStartRef.current = { ...translateRef.current };
      element.style.cursor = "grabbing";
    };

    const runMarqueeFrame = () => {
      marqueeRafRef.current = null;
      if (!isMarqueeRef.current) return;
      const last = marqueeLatestEventRef.current;
      if (!last) return;

      const sx = marqueeStartRef.current.x;
      const sy = marqueeStartRef.current.y;
      const rect = {
        x: Math.min(sx, last.x),
        y: Math.min(sy, last.y),
        width: Math.abs(last.x - sx),
        height: Math.abs(last.y - sy),
      };
      marqueeRectRef.current = rect;
      applyMarqueeStyle();

      if (rect.width <= 3 && rect.height <= 3) return;

      const containerRect = element.getBoundingClientRect();
      const currentScale = scaleRef.current;
      const currentTranslate = translateRef.current;
      const toCanvas = (screenX: number, screenY: number) => ({
        x: (screenX - containerRect.left - currentTranslate.x) / currentScale,
        y: (screenY - containerRect.top - currentTranslate.y) / currentScale,
      });
      const topLeft = toCanvas(rect.x, rect.y);
      const bottomRight = toCanvas(rect.x + rect.width, rect.y + rect.height);
      const mx = topLeft.x;
      const my = topLeft.y;
      const mw = bottomRight.x - topLeft.x;
      const mh = bottomRight.y - topLeft.y;

      const nextSelected = new Set<string>();
      assets.forEach((asset, index) => {
        const position = getAssetPosition(asset, index);
        if (
          position.x < mx + mw &&
          position.x + position.width > mx &&
          position.y < my + mh &&
          position.y + position.height > my
        ) {
          nextSelected.add(asset.id);
        }
      });

      const prev = selectedIdsRef.current;
      if (prev.size === nextSelected.size) {
        let same = true;
        for (const id of nextSelected) {
          if (!prev.has(id)) {
            same = false;
            break;
          }
        }
        if (same) return;
      }
      setSelectedIds(nextSelected);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isMarqueeRef.current) {
        marqueeLatestEventRef.current = { x: event.clientX, y: event.clientY };
        if (marqueeRafRef.current === null) {
          marqueeRafRef.current = requestAnimationFrame(runMarqueeFrame);
        }
        return;
      }

      if (!isPanningRef.current) return;
      const dx = event.clientX - panStartRef.current.x;
      const dy = event.clientY - panStartRef.current.y;
      translateRef.current = {
        x: translateStartRef.current.x + dx,
        y: translateStartRef.current.y + dy,
      };
      applyTransform();
    };

    const handleMouseUp = () => {
      if (isMarqueeRef.current) {
        isMarqueeRef.current = false;
        if (marqueeRafRef.current !== null) {
          cancelAnimationFrame(marqueeRafRef.current);
          marqueeRafRef.current = null;
        }
        marqueeLatestEventRef.current = null;
        marqueeRectRef.current = null;
        applyMarqueeStyle();
        element.style.cursor = "grab";
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        element.style.cursor = "grab";
      }
    };

    element.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [assets, getAssetPosition, isPublic]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePrimaryAction = useCallback(
    (asset: ItemRecord) => {
      if (asset.type === "color") {
        copyItemValue(asset);
        return;
      }

      if (isMediaItem(asset)) {
        onPreview?.(asset);
        return;
      }

      if (asset.url) {
        window.open(asset.url, "_blank");
      }
    },
    [onPreview]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: "100%", cursor: isPublic ? "default" : "grab" }}
    >
      <div
        ref={canvasLayerRef}
        style={{
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          width: "10000px",
          height: "10000px",
        }}
      >
        {assets.map((asset, index) => {
          const position = getAssetPosition(asset, index);
          const isActionPending = pendingAssetIds?.has(asset.id) ?? false;
          const isSelected = selectedIds.has(asset.id);
          const canResize = !isPublic && isMediaItem(asset);

          const node = (
            <div
              className={`h-full w-full overflow-hidden border border-border/40 bg-card shadow-sm transition-colors ${
                rounded ? "rounded-md" : "rounded-none"
              } ${isActionPending ? "opacity-70" : ""}`}
              onClick={(event) => {
                if (!dragMovedRef.current.get(asset.id) && !event.shiftKey) {
                  handlePrimaryAction(asset);
                }
              }}
            >
              {isMediaItem(asset) ? (
                <AssetMedia
                  asset={asset}
                  rounded={rounded}
                  className="pointer-events-none"
                  mediaClassName="select-none"
                />
              ) : asset.type === "color" ? (
                <CanvasColorCard item={asset} rounded={rounded} />
              ) : (
                <CanvasLinkCard item={asset} rounded={rounded} />
              )}
            </div>
          );

          return (
            <Rnd
              key={asset.id}
              ref={(node) => {
                if (node) rndRefs.current.set(asset.id, node);
                else rndRefs.current.delete(asset.id);
              }}
              style={{
                zIndex: asset.canvasZIndex,
                outline: isSelected ? "2px solid var(--primary)" : undefined,
                outlineOffset: isSelected ? "2px" : undefined,
                borderRadius: rounded ? "0.5rem" : undefined,
              }}
              default={{
                x: position.x,
                y: position.y,
                width: position.width,
                height: position.height,
              }}
              minWidth={canResize ? MIN_SIZE : position.width}
              minHeight={canResize ? MIN_SIZE : position.height}
              lockAspectRatio={canResize}
              enableResizing={canResize}
              disableDragging={isPublic}
              scale={scale}
              onMouseDown={(event: MouseEvent) => {
                if (isPublic) return;
                if (event.shiftKey) {
                  event.stopPropagation();
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
                  setSelectedIds(new Set([asset.id]));
                }
              }}
              onDragStart={() => {
                if (isPublic) return;
                dragMovedRef.current.set(asset.id, false);
                const selected = selectedIdsRef.current;
                if (selected.has(asset.id) && selected.size > 1) {
                  multiDragLeaderRef.current = asset.id;
                  const snapshot = new Map<
                    string,
                    { x: number; y: number; width: number; height: number }
                  >();
                  assets.forEach((currentAsset, currentIndex) => {
                    if (selected.has(currentAsset.id)) {
                      snapshot.set(currentAsset.id, {
                        ...getAssetPosition(currentAsset, currentIndex),
                      });
                    }
                  });
                  multiDragStartPositionsRef.current = snapshot;
                } else {
                  multiDragLeaderRef.current = null;
                }
              }}
              onDrag={(_event, data) => {
                if (isPublic) return;
                dragMovedRef.current.set(asset.id, true);
                if (multiDragLeaderRef.current !== asset.id) return;
                const leaderStart = multiDragStartPositionsRef.current.get(
                  asset.id
                );
                if (!leaderStart) return;

                const dx = data.x - leaderStart.x;
                const dy = data.y - leaderStart.y;

                multiDragStartPositionsRef.current.forEach(
                  (originalPosition, id) => {
                    if (id === asset.id) return;
                    rndRefs.current.get(id)?.updatePosition({
                      x: originalPosition.x + dx,
                      y: originalPosition.y + dy,
                    });
                  }
                );
              }}
              onDragStop={(_event, data) => {
                if (isPublic) return;

                if (multiDragLeaderRef.current === asset.id) {
                  const leaderStart = multiDragStartPositionsRef.current.get(
                    asset.id
                  );
                  if (leaderStart) {
                    const dx = data.x - leaderStart.x;
                    const dy = data.y - leaderStart.y;

                    localPositionsRef.current.set(asset.id, {
                      x: data.x,
                      y: data.y,
                      width: leaderStart.width,
                      height: leaderStart.height,
                    });
                    pendingUpdatesRef.current.set(asset.id, {
                      canvasX: data.x,
                      canvasY: data.y,
                      canvasWidth: leaderStart.width,
                      canvasHeight: leaderStart.height,
                    });

                    multiDragStartPositionsRef.current.forEach(
                      (originalPosition, id) => {
                        if (id === asset.id) return;
                        const nextPosition = {
                          x: originalPosition.x + dx,
                          y: originalPosition.y + dy,
                          width: originalPosition.width,
                          height: originalPosition.height,
                        };
                        localPositionsRef.current.set(id, nextPosition);
                        pendingUpdatesRef.current.set(id, {
                          canvasX: nextPosition.x,
                          canvasY: nextPosition.y,
                          canvasWidth: nextPosition.width,
                          canvasHeight: nextPosition.height,
                        });
                      }
                    );
                  }

                  multiDragLeaderRef.current = null;
                  multiDragStartPositionsRef.current.clear();
                  scheduleFlush();
                  return;
                }

                const updatedPosition = {
                  x: data.x,
                  y: data.y,
                  width: position.width,
                  height: position.height,
                };
                localPositionsRef.current.set(asset.id, updatedPosition);
                pendingUpdatesRef.current.set(asset.id, {
                  canvasX: data.x,
                  canvasY: data.y,
                  canvasWidth: position.width,
                  canvasHeight: position.height,
                });
                scheduleFlush();
              }}
              onResizeStop={
                canResize
                  ? (_event, _direction, ref, _delta, nextPosition) => {
                      const width = parseFloat(ref.style.width);
                      const height = parseFloat(ref.style.height);
                      const updatedPosition = {
                        x: nextPosition.x,
                        y: nextPosition.y,
                        width,
                        height,
                      };
                      localPositionsRef.current.set(asset.id, updatedPosition);
                      pendingUpdatesRef.current.set(asset.id, {
                        canvasX: nextPosition.x,
                        canvasY: nextPosition.y,
                        canvasWidth: width,
                        canvasHeight: height,
                      });
                      scheduleFlush();
                    }
                  : undefined
              }
              className="group"
            >
              {isPublic ? (
                node
              ) : (
                <ContextMenu>
                  <ContextMenuTrigger className="h-full w-full">
                    {node}
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    {onUpdateZIndex && (
                      <>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          disabled={asset._temp}
                          onClick={() => {
                            const maxZ = Math.max(
                              ...assets.map((entry) => entry.canvasZIndex)
                            );
                            if (asset.canvasZIndex < maxZ) {
                              onUpdateZIndex([
                                { id: asset.id, canvasZIndex: maxZ + 1 },
                              ]);
                            }
                          }}
                        >
                          <ArrowUpFromLine className="size-3.5 text-neutral-500 stroke-[1.5]" />
                          Bring to front
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          disabled={asset._temp}
                          onClick={() => {
                            const sorted = [...assets].sort(
                              (a, b) => a.canvasZIndex - b.canvasZIndex
                            );
                            const currentIndex = sorted.findIndex(
                              (entry) => entry.id === asset.id
                            );
                            if (currentIndex < sorted.length - 1) {
                              const next = sorted[currentIndex + 1];
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
                          }}
                        >
                          <ChevronUp className="size-3.5 text-neutral-500 stroke-[1.5]" />
                          Bring forward
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          disabled={asset._temp}
                          onClick={() => {
                            const sorted = [...assets].sort(
                              (a, b) => a.canvasZIndex - b.canvasZIndex
                            );
                            const currentIndex = sorted.findIndex(
                              (entry) => entry.id === asset.id
                            );
                            if (currentIndex > 0) {
                              const previous = sorted[currentIndex - 1];
                              onUpdateZIndex([
                                {
                                  id: asset.id,
                                  canvasZIndex: previous.canvasZIndex,
                                },
                                {
                                  id: previous.id,
                                  canvasZIndex: asset.canvasZIndex,
                                },
                              ]);
                            }
                          }}
                        >
                          <ChevronDown className="size-3.5 text-neutral-500 stroke-[1.5]" />
                          Send backward
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          disabled={asset._temp}
                          onClick={() => {
                            const minZ = Math.min(
                              ...assets.map((entry) => entry.canvasZIndex)
                            );
                            if (asset.canvasZIndex > minZ) {
                              onUpdateZIndex([
                                { id: asset.id, canvasZIndex: minZ - 1 },
                              ]);
                            }
                          }}
                        >
                          <ArrowDownToLine className="size-3.5 text-neutral-500 stroke-[1.5]" />
                          Send to back
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                      </>
                    )}

                    {asset.url && (
                      <>
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          onClick={() => window.open(asset.url ?? "", "_blank")}
                        >
                          <ExternalLink className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                          Open in new tab
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                      </>
                    )}

                    <ContextMenuItem
                      className="flex items-center gap-2"
                      onClick={() => copyItemValue(asset)}
                    >
                      {asset.type === "color" ? (
                        <Palette className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                      ) : (
                        <CopyIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                      )}
                      {asset.type === "color" ? "Copy color" : "Copy URL"}
                    </ContextMenuItem>

                    {asset.type === "image" && asset.url && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="flex items-center gap-2"
                          onClick={async () => {
                            try {
                              const res = await fetch(asset.url ?? "");
                              const blob = await res.blob();
                              const pngBlob =
                                blob.type === "image/png"
                                  ? blob
                                  : await new Promise<Blob>((resolve) => {
                                      const image = new window.Image();
                                      image.crossOrigin = "anonymous";
                                      image.onload = () => {
                                        const canvas =
                                          document.createElement("canvas");
                                        canvas.width = image.naturalWidth;
                                        canvas.height = image.naturalHeight;
                                        canvas
                                          .getContext("2d")!
                                          .drawImage(image, 0, 0);
                                        canvas.toBlob(
                                          (nextBlob) => resolve(nextBlob!),
                                          "image/png"
                                        );
                                      };
                                      image.src = asset.url ?? "";
                                    });
                              await navigator.clipboard.write([
                                new ClipboardItem({ "image/png": pngBlob }),
                              ]);
                              successToast("Image copied to clipboard");
                            } catch {
                              errorToast("Failed to copy image");
                            }
                          }}
                        >
                          <ImageIcon className="size-3.5 text-neutral-500 stroke-[1.5] fill-current/10 dark:fill-current/20" />
                          Copy image
                        </ContextMenuItem>
                      </>
                    )}

                    {onMove &&
                      !isActionPending &&
                      availableFolders.length > 0 && (
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
                              {availableFolders.map((folder, currentIndex) => (
                                <div key={folder.id}>
                                  <ContextMenuItem
                                    onClick={() => onMove(asset, folder.id)}
                                  >
                                    {folder.icon && <span>{folder.icon}</span>}
                                    {folder.name}
                                  </ContextMenuItem>
                                  {currentIndex !==
                                    availableFolders.length - 1 && (
                                    <ContextMenuSeparator />
                                  )}
                                </div>
                              ))}
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                        </>
                      )}

                    {onDelete && !isActionPending && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          className="flex items-center gap-2 hover:text-destructive focus:text-destructive group"
                          disabled={asset._temp}
                          onClick={() => onDelete(asset)}
                        >
                          <Trash2 className="size-3.5 stroke-[1.5] text-neutral-500 fill-current/10 dark:fill-current/20 group-hover:text-destructive/20 group-focus:text-destructive" />
                          Delete
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              )}
            </Rnd>
          );
        })}
      </div>

      {!isPublic && (
        <div
          ref={marqueeDivRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            display: "none",
            pointerEvents: "none",
            zIndex: 9999,
          }}
          className="rounded-sm border border-primary/40 bg-primary/10"
        />
      )}

      <div className="absolute bottom-4 right-4 rounded-sm border border-border bg-popover px-2.5 py-1 text-xs tabular-nums text-popover-foreground backdrop-blur-sm">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
