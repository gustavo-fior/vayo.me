"use client";

import { Bookmark } from "@/components/bookmark";
import { EmptyState } from "@/components/empty-state";
import { CreateFirstFolder } from "@/components/folders/create-first-folder";
import { SelectFolder } from "@/components/folders/select-folder";
import ShareFolder from "@/components/folders/share-folder";
import { Input } from "@/components/ui/input";
import UserMenu from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { groupBookmarksByMonth } from "@/utils/get-bookmarks-by-month";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { addHttpIfMissing, isValidURL } from "@/utils/url-validator";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { BookmarkIcon, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "next-themes";
import { getLastFolderId, saveLastFolderId } from "@/utils/local-storage";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { getCommonFavicons, getWebsiteName } from "@/utils/get-common-favicons";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Shortcut } from "@/components/ui/shortcut";

export type Folder = {
  id: string;
  name: string;
  icon: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  totalBookmarks: number;
};

export default function Bookmarks() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMonths, setShowMonths] = useState(false);
  const [showOgImage, setShowOgImage] = useState(false);
  const [isInvalidUrl, setIsInvalidUrl] = useState(false);
  const [isBookmarkAdded, setIsBookmarkAdded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const folders = useQuery(trpc.folders.getFolders.queryOptions());

  const bookmarks = useInfiniteQuery({
    queryKey: ["bookmarks", "getBookmarksByFolderId", selectedFolder?.id],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return await trpcClient.bookmarks.getBookmarksByFolderId.query({
        folderId: selectedFolder?.id!,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      // If the last page has less than 30 items (PAGE_SIZE), we've reached the end
      return lastPage.length === 30 ? allPages.length + 1 : undefined;
    },
    enabled: !!selectedFolder?.id,
  });

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

  const createBookmark = useMutation(
    trpc.bookmarks.createBookmark.mutationOptions({
      onMutate: async ({ url, folderId }) => {
        setIsBookmarkAdded(true);
        setTimeout(() => {
          setIsBookmarkAdded(false);
        }, 2000);

        // Cancel any outgoing refetches to avoid conflicts
        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", folderId],
        });

        // Snapshot the previous bookmarks data
        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          folderId,
        ]);

        // Create optimistic bookmark with temporary data
        const optimisticBookmark = {
          id: `temp-${Date.now()}-${Math.random()}`, // Temporary ID
          url,
          title: capitalizeFirstLetter(getWebsiteName(url)), // Placeholder title
          description: null,
          faviconUrl: getCommonFavicons(url) ?? null,
          ogImageUrl: null,
          folderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Optimistically update the cache by adding the new bookmark to the first page
        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", folderId],
          (old: any) => {
            if (!old) {
              return {
                pages: [[optimisticBookmark]],
                pageParams: [1],
              };
            }

            // Add the new bookmark to the beginning of the first page
            const newPages = [...old.pages];
            if (newPages.length > 0) {
              newPages[0] = [optimisticBookmark, ...newPages[0]];
            } else {
              newPages[0] = [optimisticBookmark];
            }

            return {
              ...old,
              pages: newPages,
            };
          }
        );

        // Return context for rollback
        return { previousBookmarks, folderId };
      },
      onError: (_, __, context) => {
        // Rollback to previous state on error
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", context.folderId],
            context.previousBookmarks
          );
        }
        toast.error("Failed to create bookmark");
      },
      onSettled: (_, __, variables) => {
        // Always refetch to ensure data consistency
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", variables.folderId],
        });
      },
    })
  );

  useHotkeys("v", () => setShowOgImage(!showOgImage));
  useHotkeys("m", () => setShowMonths(!showMonths));
  useHotkeys("t", () => setTheme(theme === "dark" ? "light" : "dark"));
  useHotkeys("shift+f", (event) => {
    event.preventDefault();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  });

  useEffect(() => {
    if (
      folders.isSuccess &&
      folders.data &&
      folders.data.length > 0 &&
      !selectedFolder?.id
    ) {
      // Try to get the last selected folder from localStorage
      const lastFolderId = getLastFolderId();

      if (lastFolderId) {
        // Check if the last folder still exists in the current folders
        const lastFolder = folders.data.find(
          (folder) => folder.id === lastFolderId
        );
        if (lastFolder) {
          setSelectedFolder(lastFolder);
          return;
        }
      }

      // Fallback to the first folder if no valid last folder found
      setSelectedFolder(folders.data[0]);
    }
  }, [folders.isSuccess, folders.data, selectedFolder?.id]);

  // Save selected folder to localStorage whenever it changes
  useEffect(() => {
    if (selectedFolder?.id) {
      saveLastFolderId(selectedFolder.id);
    }
  }, [selectedFolder?.id]);

  // Debounced search effect
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(url);
    }, 300); // 300ms debounce

    // Cleanup timeout on unmount or url change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [url]);

  // Memoized filtered bookmarks for performance
  const filteredAndGroupedBookmarks = useMemo(() => {
    if (!bookmarks.data) return [];

    // Flatten all pages into a single array for grouping
    const allBookmarks = bookmarks.data.pages.flat();

    const filteredBookmarks = searchQuery
      ? allBookmarks.filter(
          (bookmark) =>
            bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bookmark.description
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase())
        )
      : allBookmarks;

    return groupBookmarksByMonth(filteredBookmarks);
  }, [bookmarks.data, searchQuery]);

  useEffect(() => {
    if (!session?.user && !isSessionPending) {
      router.push("/");
    }
  }, [session?.user, isSessionPending]);

  return (
    <>
      <div className="sticky top-0 z-10">
        <div className="flex flex-row items-center justify-between md:py-8 md:px-8 md:pr-8 pr-4 py-6 px-2">
          <SelectFolder
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            folders={folders.data ?? []}
          />
          <div className="flex items-center gap-2">
            <ShareFolder
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
            />
            <UserMenu
              showMonths={showMonths}
              setShowMonths={setShowMonths}
              showOgImage={showOgImage}
              setShowOgImage={setShowOgImage}
            />
          </div>
        </div>
      </div>
      <div className="container mx-auto max-w-2xl px-4 pb-36">
        <div className="grid">
          {folders.isSuccess && folders.data && folders.data.length === 0 && (
            <div className="flex flex-col justify-center items-center min-h-[70vh]">
              <CreateFirstFolder setSelectedFolder={setSelectedFolder} />
            </div>
          )}
          {folders.isSuccess && folders.data && folders.data.length > 0 && (
            <div className="relative">
              <Input
                placeholder="https://"
                className={cn(
                  isBookmarkAdded &&
                    "focus-visible:border-green-400 rounded-md focus-visible:ring-green-400/20 focus-visible:ring-2 dark:focus-visible:border-green-600 dark:focus-visible:ring-green-600/20",
                  isInvalidUrl &&
                    "animate-shake focus-visible:border-destructive rounded-md focus-visible:ring-destructive/20 focus-visible:ring-2"
                )}
                ref={inputRef}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isValidURL(url)) {
                      setUrl("");
                      createBookmark.mutate({
                        url: addHttpIfMissing(url),
                        folderId: selectedFolder!.id!,
                      });
                    } else {
                      setIsInvalidUrl(true);
                      setTimeout(() => {
                        setIsInvalidUrl(false);
                      }, 2000);
                    }
                  }
                }}
                onPaste={(e) => {
                  // Get the pasted text
                  const pastedText = e.clipboardData.getData("text");

                  // Check if the pasted text is a valid URL
                  if (isValidURL(pastedText)) {
                    // Prevent default paste behavior
                    e.preventDefault();

                    // Set the URL in state and create bookmark
                    setUrl(pastedText);

                    // Small delay to ensure state update, then create bookmark
                    setTimeout(() => {
                      createBookmark.mutate({
                        url: addHttpIfMissing(pastedText),
                        folderId: selectedFolder!.id!,
                      });
                      setUrl("");
                    }, 0);
                  } else {
                    setIsInvalidUrl(true);
                    setTimeout(() => {
                      setIsInvalidUrl(false);
                    }, 2000);
                  }
                }}
              />

              <AnimatePresence>
                {isInvalidUrl && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      filter: "blur(0px)",
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                    className="absolute text-destructive text-sm right-3 top-1/2 -translate-y-1/2"
                  >
                    Invalid URL
                  </motion.div>
                )}
                {!isInvalidUrl && !isBookmarkAdded && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      filter: "blur(0px)",
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                    className="absolute flex items-center gap-2 right-3 top-1/2 -translate-y-1/2"
                  >
                    <Shortcut>Shift</Shortcut>
                    <Shortcut>F</Shortcut>
                  </motion.div>
                )}
                {isBookmarkAdded && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      filter: "blur(0px)",
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      x: 8,
                      filter: "blur(4px)",
                      scale: 0.97,
                    }}
                    transition={{ duration: 0.1, ease: "easeInOut" }}
                    className="absolute text-green-400 text-sm right-3 top-1/2 -translate-y-1/2 dark:text-green-600"
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!showMonths && folders.data && folders.data.length > 0 && (
            <hr className="mt-6 mb-2 opacity-50" />
          )}

          {bookmarks.isSuccess &&
            folders.data &&
            folders.data.length > 0 &&
            bookmarks.data?.pages.every((page: any[]) => page.length === 0) && (
              <div className="mt-24">
                <EmptyState
                  title="No bookmarks here"
                  Icon={BookmarkIcon}
                  description="Add some cool links to get started"
                />
              </div>
            )}

          {bookmarks.data &&
            filteredAndGroupedBookmarks.map(
              ([month, monthBookmarks], monthIndex) => {
                return (
                  <div key={month} className="space-y-2">
                    {showMonths && (
                      <h2 className="text-lg font-medium border-b border-neutral-200 dark:border-neutral-800 pb-2 mt-8">
                        {month}
                      </h2>
                    )}
                    <div>
                      {monthBookmarks.map(
                        (bookmark: any, bookmarkIndex: number) => {
                          // Check if this is the last bookmark across all months and pages
                          const isLastMonth =
                            monthIndex ===
                            filteredAndGroupedBookmarks.length - 1;
                          const isLastBookmarkInMonth =
                            bookmarkIndex === monthBookmarks.length - 1;
                          const isLastBookmark =
                            isLastMonth && isLastBookmarkInMonth;

                          return (
                            <div
                              key={bookmark.id}
                              ref={
                                isLastBookmark ? lastBookmarkElementRef : null
                              }
                            >
                              <Bookmark
                                bookmark={{
                                  ...bookmark,
                                  createdAt: new Date(bookmark.createdAt),
                                  updatedAt: new Date(bookmark.updatedAt),
                                }}
                                showOgImage={showOgImage}
                                isPublicPage={false}
                                folders={folders.data ?? []}
                              />
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              }
            )}
        </div>
      </div>
    </>
  );
}
