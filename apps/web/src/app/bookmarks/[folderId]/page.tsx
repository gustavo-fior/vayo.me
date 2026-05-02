"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import {
  BookmarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Grid2X2,
  LayoutDashboard,
  List,
  Lock,
  Moon,
  Sun,
} from "lucide-react";
import { Bookmark } from "@/components/bookmark";
import { CanvasView } from "@/components/canvas/canvas-view";
import { MasonryGrid } from "@/components/canvas/masonry-grid";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { trpc, trpcClient } from "@/utils/trpc";
import { groupItemsByMonth } from "@/utils/get-items-by-month";
import {
  getPublicFolderViewPreference,
  savePublicFolderViewPreference,
} from "@/utils/local-storage";
import {
  canvasItemsQueryKey,
  gridItemsQueryKey,
  listItemsQueryKey,
} from "@/utils/item-query-keys";
import type { FolderView, ItemRecord } from "@/types/items";

const PAGE_SIZE = 50;

function normalizeItem(item: any): ItemRecord {
  return {
    ...item,
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : item.createdAt.toISOString(),
    updatedAt:
      typeof item.updatedAt === "string"
        ? item.updatedAt
        : item.updatedAt.toISOString(),
  };
}

function sortByNewest(items: ItemRecord[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function Bookmarks() {
  const { folderId } = useParams();
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<FolderView>("list");
  const [previewItem, setPreviewItem] = useState<ItemRecord | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const folder = useQuery({
    ...trpc.folders.getPublicFolderById.queryOptions(folderId as string),
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  const listItems = useInfiniteQuery({
    queryKey: listItemsQueryKey(folderId as string),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return trpcClient.items.getPublicItemsByFolderId.query({
        folderId: folderId as string,
        page: pageParam,
        view: "list",
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    enabled: !!folderId && currentView === "list" && !!folder.data,
    retry: false,
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  const gridItems = useInfiniteQuery({
    queryKey: gridItemsQueryKey(folderId as string),
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return trpcClient.items.getPublicItemsByFolderId.query({
        folderId: folderId as string,
        page: pageParam,
        view: "grid",
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    enabled: !!folderId && currentView === "grid" && !!folder.data,
    retry: false,
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  const canvasItems = useQuery({
    queryKey: canvasItemsQueryKey(folderId as string),
    queryFn: async () => {
      return trpcClient.items.getPublicCanvasItemsByFolderId.query({
        folderId: folderId as string,
      });
    },
    enabled: !!folderId && currentView === "canvas" && !!folder.data,
    retry: false,
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  useEffect(() => {
    if (!folder.data) return;
    setCurrentView(
      getPublicFolderViewPreference(folder.data.id, folder.data.defaultView)
    );
  }, [folder.data?.defaultView, folder.data?.id]);

  const setPublicView = useCallback(
    (view: FolderView) => {
      if (!folder.data) return;
      setCurrentView(view);
      savePublicFolderViewPreference(folder.data.id, view);
    },
    [folder.data]
  );

  const activeInfiniteQuery = currentView === "grid" ? gridItems : listItems;

  const lastItemElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (currentView === "canvas") return;
      if (activeInfiniteQuery.isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && activeInfiniteQuery.hasNextPage) {
          activeInfiniteQuery.fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [
      activeInfiniteQuery.fetchNextPage,
      activeInfiniteQuery.hasNextPage,
      activeInfiniteQuery.isFetchingNextPage,
      currentView,
    ]
  );

  const visibleListItems = useMemo(
    () => sortByNewest((listItems.data?.pages.flat() ?? []).map(normalizeItem)),
    [listItems.data]
  );
  const visibleGridItems = useMemo(
    () => (gridItems.data?.pages.flat() ?? []).map(normalizeItem),
    [gridItems.data]
  );
  const visibleCanvasItems = useMemo(
    () => (canvasItems.data ?? []).map(normalizeItem),
    [canvasItems.data]
  );

  const groupedListItems = useMemo(
    () => groupItemsByMonth(visibleListItems),
    [visibleListItems]
  );

  const previewItems = useMemo(() => {
    const currentItems =
      currentView === "canvas"
        ? visibleCanvasItems
        : currentView === "grid"
        ? visibleGridItems
        : visibleListItems;
    return currentItems.filter(
      (item) => item.type === "image" || item.type === "video"
    );
  }, [currentView, visibleCanvasItems, visibleGridItems, visibleListItems]);

  const navigatePreview = useCallback(
    (direction: "next" | "previous") => {
      if (!previewItem || previewItems.length < 2) return;

      const index = previewItems.findIndex(
        (item) => item.id === previewItem.id
      );
      if (index === -1) return;

      const nextItem =
        direction === "next"
          ? previewItems[(index + 1) % previewItems.length]
          : previewItems[
              (index - 1 + previewItems.length) % previewItems.length
            ];

      setPreviewItem(nextItem);
    },
    [previewItem, previewItems]
  );

  useEffect(() => {
    if (!previewItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      navigatePreview(event.key === "ArrowRight" ? "next" : "previous");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigatePreview, previewItem]);

  const notShared = folder.isError;

  return (
    <>
      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="bg-transparent !border-0 shadow-none max-w-[90vw] max-h-[90vh] p-0 flex items-center justify-center ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none focus-visible:outline-none"
        >
          <DialogTitle className="sr-only">Item preview</DialogTitle>
          <div className="flex items-center justify-center gap-3 md:gap-4">
            {previewItems.length > 1 && previewItem && (
              <button
                type="button"
                aria-label="Previous item"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur outline-none transition hover:bg-black/70"
                onClick={() => navigatePreview("previous")}
              >
                <ChevronLeftIcon className="size-5" />
              </button>
            )}
            {previewItem?.type === "video" ? (
              <video
                src={previewItem.url ?? ""}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
              />
            ) : previewItem ? (
              <img
                src={previewItem.url ?? ""}
                alt={previewItem.originalFilename || previewItem.title}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
              />
            ) : null}
            {previewItems.length > 1 && previewItem && (
              <button
                type="button"
                aria-label="Next item"
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur outline-none transition hover:bg-black/70"
                onClick={() => navigatePreview("next")}
              >
                <ChevronRightIcon className="size-5" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div
        className={`container mx-auto transition-all duration-300 ${
          currentView === "canvas"
            ? "max-w-full px-12"
            : currentView === "grid"
            ? "max-w-6xl px-6 md:px-8"
            : "max-w-2xl"
        } py-6 md:py-12`}
      >
        <div className="grid">
          <div className="flex items-center justify-between px-2 md:px-2.5">
            {!notShared ? (
              <div className="flex items-center gap-2">
                <Lock className="size-4 dark:text-neutral-600 text-neutral-400" />
                <h1 className="text-base font-medium">Not Shared</h1>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {folder.data?.icon && (
                  <span className="text-sm md:text-base">
                    {folder.data.icon}
                  </span>
                )}
                <h1 className="text-base font-medium">{folder.data?.name}</h1>
              </div>
            )}
            {!notShared && !folder.isPending && (
              <div className="flex items-center gap-1">
                <Button
                  variant={currentView === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setPublicView("list")}
                >
                  <List className="size-4" />
                </Button>
                <Button
                  variant={currentView === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setPublicView("grid")}
                >
                  <Grid2X2 className="size-4" />
                </Button>
                <Button
                  variant={currentView === "canvas" ? "secondary" : "ghost"}
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setPublicView("canvas")}
                >
                  <LayoutDashboard className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Moon /> : <Sun />}
                </Button>
              </div>
            )}
          </div>

          {!folder.isPending && <hr className="mb-2 mt-2 opacity-50" />}

          {currentView === "list" &&
            visibleListItems.length === 0 &&
            !notShared && (
              <div className="mt-24">
                <EmptyState title="No items here" Icon={BookmarkIcon} />
              </div>
            )}

          {currentView === "list" &&
            groupedListItems.map(([month, monthItems], monthIndex) => (
              <div key={month} className="space-y-2">
                <h2 className="mt-8 border-b border-neutral-200 px-2.5 pb-2 text-base font-medium dark:border-neutral-800">
                  {month}
                </h2>
                <div>
                  {monthItems.map((item: ItemRecord, itemIndex: number) => {
                    const isLastMonth =
                      monthIndex === groupedListItems.length - 1;
                    const isLastItemInMonth =
                      itemIndex === monthItems.length - 1;
                    const isLastItem = isLastMonth && isLastItemInMonth;

                    return (
                      <div
                        key={item.id}
                        ref={isLastItem ? lastItemElementRef : null}
                      >
                        <Bookmark
                          bookmark={item}
                          showOgImage
                          isPublicPage
                          folders={[]}
                          onPreview={setPreviewItem}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

          {currentView === "grid" &&
            visibleGridItems.length === 0 &&
            !notShared && (
              <div className="mt-24">
                <EmptyState title="No items here" Icon={LayoutDashboard} />
              </div>
            )}

          {currentView === "grid" && visibleGridItems.length > 0 && (
            <div className="mt-4 md:pb-24">
              <MasonryGrid
                assets={visibleGridItems}
                columns={3}
                isPublic
                onPreview={setPreviewItem}
              />
              <div ref={lastItemElementRef} className="h-1" />
            </div>
          )}

          {currentView === "canvas" &&
            visibleCanvasItems.length === 0 &&
            !notShared && (
              <div className="mt-24">
                <EmptyState title="No items here" Icon={LayoutDashboard} />
              </div>
            )}

          {currentView === "canvas" && visibleCanvasItems.length > 0 && (
            <div className="mt-4 min-h-[90vh]">
              <CanvasView
                assets={visibleCanvasItems}
                rounded
                isPublic
                onPreview={setPreviewItem}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
