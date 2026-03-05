"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { AssetUploadZone } from "./asset-upload-zone";
import { MasonryGrid } from "./masonry-grid";
import { CanvasView } from "./canvas-view";
import { EmptyState } from "../empty-state";
import { LayoutPanelLeftIcon } from "lucide-react";
import { toast } from "sonner";
import type { CanvasAssetType } from "./asset-card";
import type { CanvasControls } from "../user-menu";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

const STORAGE_KEY_COLUMNS = "vayo-canvas-columns";
const STORAGE_KEY_VIEW = "vayo-canvas-view";
const STORAGE_KEY_FULL_WIDTH = "vayo-canvas-full-width";

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

export function useCanvasControls(): CanvasControls {
  const [viewMode, setViewMode] = useState<"masonry" | "canvas">(getStoredView);
  const [columns, setColumns] = useState<number>(getStoredColumns);
  const [fullWidth, setFullWidth] = useState<boolean>(getStoredFullWidth);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLUMNS, columns.toString());
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FULL_WIDTH, fullWidth.toString());
  }, [fullWidth]);

  return {
    viewMode,
    setViewMode,
    columns,
    setColumns,
    fullWidth,
    setFullWidth,
  };
}

export function CanvasFolderView({
  folderId,
  canvasControls,
}: {
  folderId: string;
  canvasControls: CanvasControls;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [previewAsset, setPreviewAsset] = useState<CanvasAssetType | null>(
    null
  );
  const { viewMode, columns } = canvasControls;

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

  const deleteAsset = useMutation(
    trpc.canvasAssets.deleteAsset.mutationOptions({
      onMutate: async (assetId) => {
        await queryClient.cancelQueries({
          queryKey: ["canvasAssets", "getAssetsByFolderId", folderId],
        });

        const previous = queryClient.getQueryData([
          "canvasAssets",
          "getAssetsByFolderId",
          folderId,
        ]);

        queryClient.setQueryData(
          ["canvasAssets", "getAssetsByFolderId", folderId],
          (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any[]) =>
                page.filter((a: any) => a.id !== assetId)
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
        toast.error("Failed to delete asset");
      },
      onSettled: (_data, error) => {
        // Only refetch if the delete failed (error case already rolled back above)
        // Skipping refetch on success avoids flicker since the optimistic update is correct
        if (error) {
          queryClient.invalidateQueries({
            queryKey: ["canvasAssets", "getAssetsByFolderId", folderId],
          });
        }
      },
    })
  );

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

  const isEmpty =
    assets.isSuccess &&
    assets.data?.pages.every((page: any[]) => page.length === 0);

  return (
    <div className="relative">
      {isEmpty && (
        <div className="mt-24">
          <EmptyState
            title="No assets yet"
            Icon={LayoutPanelLeftIcon}
            description="Add images or videos to get started"
          />
        </div>
      )}

      {viewMode === "masonry" && allAssets.length > 0 && (
        <div className="space-y-4 md:pb-48 pb-32">
          <MasonryGrid
            assets={allAssets}
            columns={columns}
            onDelete={(id) => deleteAsset.mutate(id)}
            onReorder={handleReorder}
            onPreview={setPreviewAsset}
          />
          <div ref={lastElementRef} className="h-1" />
        </div>
      )}

      {viewMode === "canvas" && allAssets.length > 0 && (
        <CanvasView
          assets={allAssets}
          onDelete={(id) => deleteAsset.mutate(id)}
          onUpdateZIndex={(updates) => updateZIndex.mutate(updates)}
          onPreview={setPreviewAsset}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
