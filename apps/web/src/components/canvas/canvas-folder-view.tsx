"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { AssetUploadZone } from "./asset-upload-zone";
import { MasonryGrid } from "./masonry-grid";
import { CanvasView } from "./canvas-view";
import { EmptyState } from "../empty-state";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutPanelLeftIcon,
} from "lucide-react";
import type { CanvasAssetType } from "./asset-card";
import type { CanvasControls } from "../user-menu";
import type { Folder } from "@/app/bookmarks/page";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import {
  deriveVisibleAssets,
  getPendingItemIds,
  type PendingAssetAction,
} from "@/utils/folder-pending-actions";

const STORAGE_KEY_COLUMNS = "vayo-canvas-columns";
const STORAGE_KEY_VIEW = "vayo-canvas-view";
const STORAGE_KEY_FULL_WIDTH = "vayo-canvas-full-width";
const STORAGE_KEY_MORE_SPACE = "vayo-canvas-more-space";
const STORAGE_KEY_ROUNDED = "vayo-canvas-rounded";

function getStoredColumns(): number {
  if (typeof window === "undefined") return 3;
  const stored = localStorage.getItem(STORAGE_KEY_COLUMNS);
  return stored ? parseInt(stored, 10) : 3;
}

function getStoredView(): "masonry" | "canvas" {
  if (typeof window === "undefined") return "masonry";
  const stored = localStorage.getItem(STORAGE_KEY_VIEW);
  return stored === "canvas" ? "canvas" : "masonry";
}

function getStoredFullWidth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_FULL_WIDTH) === "true";
}

function getStoredMoreSpace(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY_MORE_SPACE) === "true";
}

function getStoredRounded(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY_ROUNDED);
  return stored === null ? true : stored === "true";
}

export function useCanvasControls(): CanvasControls {
  const [viewMode, setViewMode] = useState<"masonry" | "canvas">(getStoredView);
  const [columns, setColumns] = useState<number>(getStoredColumns);
  const [fullWidth, setFullWidth] = useState<boolean>(getStoredFullWidth);
  const [moreSpace, setMoreSpace] = useState<boolean>(getStoredMoreSpace);
  const [rounded, setRounded] = useState<boolean>(getStoredRounded);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLUMNS, columns.toString());
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [viewMode]);

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
  folders?: Folder[];
  pendingActions?: PendingAssetAction[];
  onDeleteAsset?: (asset: CanvasAssetType) => void;
  onMoveAsset?: (asset: CanvasAssetType, folderId: string) => void;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [previewAsset, setPreviewAsset] = useState<CanvasAssetType | null>(
    null
  );
  const { viewMode, columns, moreSpace, rounded } = canvasControls;

  const assets = useInfiniteQuery({
    queryKey: ["canvasAssets", "getAssetsByFolderId", folderId],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await trpcClient.canvasAssets.getAssetsByFolderId.query({
        folderId,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === 50 ? allPages.length + 1 : undefined;
    },
    enabled: !!folderId,
  });

  const updateSortOrder = useMutation(
    trpc.canvasAssets.updateSortOrder.mutationOptions({})
  );

  const updateZIndex = useMutation(
    trpc.canvasAssets.updateZIndex.mutationOptions({
      onMutate: async (updates) => {
        await queryClient.cancelQueries({
          queryKey: ["canvasAssets", "getAssetsByFolderId", folderId],
        });

        const previous = queryClient.getQueryData([
          "canvasAssets",
          "getAssetsByFolderId",
          folderId,
        ]);

        const updateMap = new Map(updates.map((u) => [u.id, u.canvasZIndex]));
        queryClient.setQueryData(
          ["canvasAssets", "getAssetsByFolderId", folderId],
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any[]) =>
                page.map((a: any) =>
                  updateMap.has(a.id)
                    ? { ...a, canvasZIndex: updateMap.get(a.id) }
                    : a
                )
              ),
            };
          }
        );

        return { previous };
      },
      onError: (_, __, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            ["canvasAssets", "getAssetsByFolderId", folderId],
            context.previous
          );
        }
      },
    })
  );

  const handleReorder = useCallback(
    (reorderedAssets: CanvasAssetType[]) => {
      const updates = reorderedAssets.map((asset, index) => ({
        id: asset.id,
        sortOrder: index,
      }));
      updateSortOrder.mutate(updates);
    },
    [updateSortOrder]
  );

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (assets.isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && assets.hasNextPage) {
          assets.fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [assets.isFetchingNextPage, assets.hasNextPage, assets.fetchNextPage]
  );

  const allAssets: CanvasAssetType[] =
    assets.data?.pages.flat().map((a: any) => ({
      ...a,
      createdAt:
        typeof a.createdAt === "string"
          ? a.createdAt
          : a.createdAt.toISOString(),
      updatedAt:
        typeof a.updatedAt === "string"
          ? a.updatedAt
          : a.updatedAt.toISOString(),
    })) ?? [];
  const visibleAssets = useMemo(
    () => deriveVisibleAssets(allAssets, folderId, pendingActions),
    [allAssets, folderId, pendingActions]
  );
  const pendingAssetIds = useMemo(
    () => getPendingItemIds(pendingActions, folderId),
    [pendingActions, folderId]
  );

  const navigatePreview = useCallback(
    (direction: "next" | "previous") => {
      if (!previewAsset || visibleAssets.length < 2) return;

      const idx = visibleAssets.findIndex((a) => a.id === previewAsset.id);
      if (idx === -1) return;

      const nextAsset =
        direction === "next"
          ? visibleAssets[(idx + 1) % visibleAssets.length]
          : visibleAssets[
              (idx - 1 + visibleAssets.length) % visibleAssets.length
            ];

      setPreviewAsset(nextAsset);
    },
    [previewAsset, visibleAssets]
  );

  // Arrow key navigation in lightbox
  useEffect(() => {
    if (!previewAsset) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      navigatePreview(e.key === "ArrowRight" ? "next" : "previous");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewAsset, navigatePreview]);

  const isEmpty =
    assets.isSuccess &&
    visibleAssets.length === 0;

  return (
    <div className="relative">
      {isEmpty && (
        <div className={`${viewMode === "masonry" ? "mt-32" : "mt-64"}`}>
          <EmptyState
            title="No assets yet"
            Icon={LayoutPanelLeftIcon}
            description="Add images or videos to get started"
          />
        </div>
      )}

      {viewMode === "masonry" && visibleAssets.length > 0 && (
        <div className="space-y-4 md:pb-48 pb-32">
          <MasonryGrid
            assets={visibleAssets}
            columns={columns}
            moreSpace={moreSpace}
            rounded={rounded}
            folderId={folderId}
            folders={folders}
            onDelete={onDeleteAsset}
            onMove={onMoveAsset}
            onReorder={handleReorder}
            onPreview={setPreviewAsset}
            pendingAssetIds={pendingAssetIds}
          />
          <div ref={lastElementRef} className="h-1" />
        </div>
      )}

      {viewMode === "canvas" && visibleAssets.length > 0 && (
        <CanvasView
          assets={visibleAssets}
          folderId={folderId}
          folders={folders}
          rounded={rounded}
          onDelete={onDeleteAsset}
          onMove={onMoveAsset}
          onUpdateZIndex={(updates) => updateZIndex.mutate(updates)}
          onPreview={setPreviewAsset}
          pendingAssetIds={pendingAssetIds}
        />
      )}

      <AssetUploadZone folderId={folderId} floating />

      <Dialog
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="bg-transparent border-none !border-0 shadow-none max-w-[90vw] max-h-[90vh] p-0 flex items-center justify-center ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none focus-visible:outline-none"
        >
          <DialogTitle className="sr-only">Asset preview</DialogTitle>
          <div className="flex items-center justify-center gap-3 md:gap-4">
            {visibleAssets.length > 1 && previewAsset && (
              <button
                type="button"
                aria-label="Previous asset"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur outline-none ring-0 transition hover:bg-black/70 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
                onClick={() => navigatePreview("previous")}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            )}
            {previewAsset?.assetType === "video" ? (
              <video
                src={previewAsset.url}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
              />
            ) : previewAsset ? (
              <img
                src={previewAsset.url}
                alt={previewAsset.originalFilename || "Asset"}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
              />
            ) : null}
            {visibleAssets.length > 1 && previewAsset && (
              <button
                type="button"
                aria-label="Next asset"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur outline-none ring-0 transition hover:bg-black/70 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 active:outline-none active:ring-0"
                onClick={() => navigatePreview("next")}
              >
                <ChevronRightIcon className="size-5" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
