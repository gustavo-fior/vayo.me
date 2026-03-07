"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssetCard, type CanvasAssetType } from "./asset-card";

export function MasonryGrid({
  assets,
  columns,
  onDelete,
  onReorder,
  onPreview,
  isPublic = false,
}: {
  assets: CanvasAssetType[];
  columns: number;
  onDelete?: (id: string) => void;
  onReorder?: (reorderedAssets: CanvasAssetType[]) => void;
  onPreview?: (asset: CanvasAssetType) => void;
  isPublic?: boolean;
}) {
  // Local copy of assets for stable reordering without flicker
  const [localAssets, setLocalAssets] = useState(assets);
  const isDraggingRef = useRef(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Sync from props only when assets are added or removed (not reordered)
  useEffect(() => {
    if (isDraggingRef.current) return;
    const localSet = [...localAssets.map((a) => a.id)].sort().join(",");
    const propSet = [...assets.map((a) => a.id)].sort().join(",");
    if (localSet !== propSet) {
      setLocalAssets(assets);
    }
  }, [assets]);

  const handleDragStart = useCallback((e: React.DragEvent, assetId: string) => {
    isDraggingRef.current = true;
    setDraggedId(assetId);
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    if (el) {
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, assetId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (assetId !== draggedId) {
        setDropTargetId(assetId);
      }
    },
    [draggedId]
  );

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!draggedId || draggedId === targetId || !onReorder) return;

      const fromIndex = localAssets.findIndex((a) => a.id === draggedId);
      const toIndex = localAssets.findIndex((a) => a.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return;

      const reordered = [...localAssets];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);

      setLocalAssets(reordered);
      onReorder(reordered);
      setDraggedId(null);
      setDropTargetId(null);
      isDraggingRef.current = false;
    },
    [draggedId, localAssets, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
    isDraggingRef.current = false;
  }, []);

  if (localAssets.length === 0) return null;

  const canDrag = !isPublic && !!onReorder;

  // Distribute assets into columns in row order (round-robin)
  const columnArrays: CanvasAssetType[][] = Array.from(
    { length: columns },
    () => []
  );
  localAssets.forEach((asset, index) => {
    columnArrays[index % columns].push(asset);
  });

  return (
    <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {columnArrays.map((colAssets, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-3">
          {colAssets.map((asset) => (
            <div
              key={asset.id}
              draggable={canDrag}
              onDragStart={
                canDrag ? (e) => handleDragStart(e, asset.id) : undefined
              }
              onDragOver={canDrag ? (e) => handleDragOver(e, asset.id) : undefined}
              onDragLeave={canDrag ? handleDragLeave : undefined}
              onDrop={canDrag ? (e) => handleDrop(e, asset.id) : undefined}
              onDragEnd={canDrag ? handleDragEnd : undefined}
              className={`transition-all duration-150 active:scale-98 ${
                draggedId === asset.id ? "opacity-30 scale-98" : ""
              } ${
                dropTargetId === asset.id
                  ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background rounded-md"
                  : ""
              }`}
            >
              <AssetCard
                asset={asset}
                onDelete={onDelete}
                onPreview={onPreview}
                isPublic={isPublic}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
