"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { AssetUploadZone } from "./asset-upload-zone";
import { MasonryGrid } from "./masonry-grid";
import { CanvasView } from "./canvas-view";
import { EmptyState } from "../empty-state";
import { LayoutPanelLeftIcon } from "lucide-react";
import type { CanvasAssetType } from "./asset-card";
import type { CanvasControls } from "../user-menu";
import type { FolderRecord } from "@/types/items";
import {
  deriveVisibleItems,
  getPendingItemIds,
  type PendingAssetAction,
} from "@/utils/folder-pending-actions";
import {
  canvasItemsQueryKey,
  gridItemsQueryKey,
} from "@/utils/item-query-keys";

const STORAGE_KEY_COLUMNS = "vayo-canvas-columns";
const STORAGE_KEY_FULL_WIDTH = "vayo-canvas-full-width";
const STORAGE_KEY_MORE_SPACE = "vayo-canvas-more-space";
const STORAGE_KEY_ROUNDED = "vayo-canvas-rounded";

function getStoredColumns() {
  if (typeof window === "undefined") return 3;
  const stored = localStorage.getItem(STORAGE_KEY_COLUMNS);
  return stored ? parseInt(stored, 10) : 3;
}

function getStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

export function useCanvasControls(): CanvasControls {
  const [viewMode, setViewMode] = useState<"list" | "grid" | "canvas">("grid");
  const [columns, setColumns] = useState(getStoredColumns);
  const [fullWidth, setFullWidth] = useState(() =>
    getStoredBoolean(STORAGE_KEY_FULL_WIDTH, false)
  );
  const [moreSpace, setMoreSpace] = useState(() =>
    getStoredBoolean(STORAGE_KEY_MORE_SPACE, false)
  );
  const [rounded, setRounded] = useState(() =>
    getStoredBoolean(STORAGE_KEY_ROUNDED, true)
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLUMNS, columns.toString());
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FULL_WIDTH, fullWidth.toString());
  }, [fullWidth]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MORE_SPACE, moreSpace.toString());
  }, [moreSpace]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROUNDED, rounded.toString());
  }, [rounded]);

  return {
    viewMode,
    setViewMode,
    columns,
    setColumns,
    fullWidth,
    setFullWidth,
    moreSpace,
    setMoreSpace,
    rounded,
    setRounded,
  };
}

export function CanvasFolderView({
  folderId,
  canvasControls,
  folders = [],
  pendingActions = [],
  onDeleteAsset,
  onMoveAsset,
}: {
  folderId: string;
  canvasControls: CanvasControls;
  folders?: FolderRecord[];
  pendingActions?: PendingAssetAction[];
  onDeleteAsset?: (asset: CanvasAssetType) => void;
  onMoveAsset?: (asset: CanvasAssetType, folderId: string) => void;
}) {
  const { viewMode, columns, moreSpace, rounded } = canvasControls;

  const gridItems = useInfiniteQuery({
    queryKey: gridItemsQueryKey(folderId),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return trpcClient.items.getItemsByFolderId.query({
        folderId,
        page: pageParam,
        view: "grid",
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) =>
      lastPage.length === 50 ? allPages.length + 1 : undefined,
    enabled: viewMode === "grid",
  });

  const canvasItems = useQuery({
    queryKey: canvasItemsQueryKey(folderId),
    queryFn: async () => {
      return trpcClient.items.getCanvasItemsByFolderId.query({ folderId });
    },
    enabled: viewMode === "canvas",
  });

  const updateGridSortOrder = useMutation(
    trpc.items.updateGridSortOrder.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: gridItemsQueryKey(folderId) });
      },
    })
  );

  const updateZIndex = useMutation(
    trpc.items.updateCanvasZIndex.mutationOptions({
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: canvasItemsQueryKey(folderId) });
      },
    })
  );

  const items = useMemo(() => {
    const baseItems =
      viewMode === "canvas"
        ? (canvasItems.data ?? [])
        : (gridItems.data?.pages.flat() ?? []);

    return deriveVisibleItems(baseItems, folderId, pendingActions);
  }, [canvasItems.data, folderId, gridItems.data, pendingActions, viewMode]);

  const pendingItemIds = useMemo(
    () => getPendingItemIds(pendingActions, folderId),
    [folderId, pendingActions]
  );

  const isEmpty =
    (viewMode === "canvas" ? canvasItems.isSuccess : gridItems.isSuccess) &&
    items.length === 0;

  return (
    <div className="relative">
      {isEmpty && (
        <div className={`${viewMode === "grid" ? "mt-32" : "mt-64"}`}>
          <EmptyState
            title="No items yet"
            Icon={LayoutPanelLeftIcon}
            description="Add links, colors, images, or videos to get started"
          />
        </div>
      )}

      {viewMode === "grid" && items.length > 0 && (
        <div className="space-y-4 md:pb-48 pb-32">
          <MasonryGrid
            assets={items}
            columns={columns}
            moreSpace={moreSpace}
            rounded={rounded}
            folderId={folderId}
            folders={folders}
            onDelete={onDeleteAsset}
            onMove={onMoveAsset}
            onReorder={(reorderedItems) =>
              updateGridSortOrder.mutate(
                reorderedItems.map((item, index) => ({
                  id: item.id,
                  gridSortOrder: index,
                }))
              )
            }
            pendingAssetIds={pendingItemIds}
          />
        </div>
      )}

      {viewMode === "canvas" && items.length > 0 && (
        <CanvasView
          assets={items}
          folderId={folderId}
          folders={folders}
          rounded={rounded}
          onDelete={onDeleteAsset}
          onMove={onMoveAsset}
          onUpdateZIndex={(updates) => updateZIndex.mutate(updates)}
          pendingAssetIds={pendingItemIds}
        />
      )}

      <AssetUploadZone folderId={folderId} floating />
    </div>
  );
}
