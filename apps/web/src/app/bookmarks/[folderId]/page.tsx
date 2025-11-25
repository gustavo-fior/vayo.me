"use client";

import { Bookmark } from "@/components/bookmark";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { trpc, trpcClient } from "@/utils/trpc";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { BookmarkIcon, Image, Lock, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Bookmarks() {
  const { folderId } = useParams();
  const { theme, setTheme } = useTheme();
  const [notShared, setNotShared] = useState(false);
  const [showOgImage, setShowOgImage] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const folder = useQuery({
    ...trpc.folders.getPublicFolderById.queryOptions(folderId as string),
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  const bookmarks = useInfiniteQuery({
    queryKey: ["bookmarks", "getBookmarksFromSharedFolderId", folderId],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await trpcClient.bookmarks.getBookmarksFromSharedFolderId.query({
        folderId: folderId as string,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      // If the last page has less than 30 items (PAGE_SIZE), we've reached the end
      return lastPage.length === 30 ? allPages.length + 1 : undefined;
    },
    enabled: !!folderId,
    retry: false,
    meta: {
      skipGlobalErrorHandler: true,
    },
  });

  useEffect(() => {
    if (bookmarks.isError) {
      setNotShared(true);
    }
  }, [bookmarks.isError, bookmarks.error]);

  const lastBookmarkElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (bookmarks.isFetchingNextPage) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && bookmarks.hasNextPage) {
          bookmarks.fetchNextPage();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [
      bookmarks.isFetchingNextPage,
      bookmarks.hasNextPage,
      bookmarks.fetchNextPage,
    ]
  );

  return (
    <>
      <div className="container mx-auto max-w-2xl px-6 md:py-12 py-6">
        <div className="grid">
          <div className="flex items-center justify-between">
            {notShared ? (
              <div className="flex gap-2 items-center">
                <Lock className="size-5 text-neutral-500" />
                <h1 className="md:text-lg text-base font-semibold">
                  Not Shared
                </h1>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {folder.data?.icon && (
                  <span className="md:text-base text-sm">
                    {folder.data?.icon}
                  </span>
                )}
                <h1 className="md:text-lg text-base font-semibold">
                  {folder.data?.name}
                </h1>
              </div>
            )}
            {!notShared && !folder.isPending && (
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Moon /> : <Sun />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="select-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={() => setShowOgImage(!showOgImage)}
                >
                  <Image />
                </Button>
              </div>
            )}
          </div>

          {!folder.isPending && <hr className="mt-2 mb-2 opacity-50" />}

          {bookmarks.isSuccess &&
            bookmarks.data?.pages.every((page: any[]) => page.length === 0) && (
              <div className="mt-24">
                <EmptyState title="No bookmarks here" Icon={BookmarkIcon} />
              </div>
            )}

          {bookmarks.data?.pages.map((page: any[], pageIndex: number) =>
            page.map((bookmark: any, bookmarkIndex: number) => {
              const isLastPage = pageIndex === bookmarks.data!.pages.length - 1;
              const isLastBookmarkInPage = bookmarkIndex === page.length - 1;
              const isLastBookmark = isLastPage && isLastBookmarkInPage;

              return (
                <div
                  key={bookmark.id}
                  ref={isLastBookmark ? lastBookmarkElementRef : null}
                >
                  <Bookmark
                    bookmark={{
                      ...bookmark,
                      createdAt: new Date(bookmark.createdAt),
                      updatedAt: new Date(bookmark.updatedAt),
                      content: null,
                    }}
                    isPublicPage={true}
                    showOgImage={showOgImage}
                    folders={[]}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
