"use client";

import { Bookmark } from "@/components/bookmark";
import type { CanvasAssetType } from "@/components/canvas/asset-card";
import { EmptyState } from "@/components/empty-state";
import { CreateFirstFolder } from "@/components/folders/create-first-folder";
import { SelectFolder } from "@/components/folders/select-folder";
import ShareFolder from "@/components/folders/share-folder";
import { Input } from "@/components/ui/input";
import { UndoToast } from "@/components/ui/undo-toast";
import UserMenu from "@/components/user-menu";
import { cn } from "@/lib/utils";
import { groupBookmarksByMonth } from "@/utils/get-bookmarks-by-month";
import {
  deriveVisibleBookmarks,
  getPendingItemIds,
  type BookmarkRecord,
  type PendingAssetAction,
  type PendingBookmarkAction,
  type PendingFolderAction,
} from "@/utils/folder-pending-actions";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { addHttpIfMissing, isValidURL } from "@/utils/url-validator";
import { isValidColor } from "@/utils/color-validator";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { BookmarkIcon, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import { useTheme } from "next-themes";
import {
  getLastFolderId,
  getShowMonthsPreference,
  getShowOgImagePreference,
  saveLastFolderId,
  saveShowMonthsPreference,
  saveShowOgImagePreference,
} from "@/utils/local-storage";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { getCommonFavicons, getWebsiteName } from "@/utils/get-common-favicons";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Shortcut } from "@/components/ui/shortcut";
import { isEditableElement } from "@/utils/is-editable-element";
import {
  CanvasFolderView,
  useCanvasControls,
} from "@/components/canvas/canvas-folder-view";

export type Folder = {
  id: string;
  name: string;
  icon: string | null;
  isShared: boolean;
  type: "bookmarks" | "canvas";
  createdAt: string;
  updatedAt: string;
  userId: string;
  totalItems: number;
};

const UNDO_WINDOW_MS = 5000;

function isBookmarkPendingAction(
  action: PendingFolderAction
): action is PendingBookmarkAction {
  return action.entity === "bookmark";
}

function isAssetPendingAction(
  action: PendingFolderAction
): action is PendingAssetAction {
  return action.entity === "asset";
}

export default function Bookmarks() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showMonths, setShowMonths] = useState(getShowMonthsPreference);
  const [showOgImage, setShowOgImage] = useState(getShowOgImagePreference);
  const [isInvalidUrl, setIsInvalidUrl] = useState(false);
  const [isBookmarkAdded, setIsBookmarkAdded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingFolderAction[]>(
    []
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActionTimersRef = useRef<Map<string, number>>(new Map());
  const pendingActionsRef = useRef<PendingFolderAction[]>([]);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const canvasControls = useCanvasControls();

  const isCanvasFolder = selectedFolder?.type === "canvas";

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
    enabled: !!selectedFolder?.id && !isCanvasFolder,
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
          type: "link" as const,
          color: null,
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

  const createColorBookmark = useMutation(
    trpc.bookmarks.createColorBookmark.mutationOptions({
      onMutate: async ({ color, folderId }) => {
        setIsBookmarkAdded(true);
        setTimeout(() => {
          setIsBookmarkAdded(false);
        }, 2000);

        await queryClient.cancelQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", folderId],
        });

        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          "getBookmarksByFolderId",
          folderId,
        ]);

        const optimisticBookmark = {
          id: `temp-${Date.now()}-${Math.random()}`,
          url: null,
          type: "color" as const,
          color,
          title: color,
          description: null,
          faviconUrl: null,
          ogImageUrl: null,
          folderId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData(
          ["bookmarks", "getBookmarksByFolderId", folderId],
          (old: any) => {
            if (!old) {
              return {
                pages: [[optimisticBookmark]],
                pageParams: [1],
              };
            }

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

        return { previousBookmarks, folderId };
      },
      onError: (_, __, context) => {
        if (context?.previousBookmarks) {
          queryClient.setQueryData(
            ["bookmarks", "getBookmarksByFolderId", context.folderId],
            context.previousBookmarks
          );
        }
        toast.error("Failed to save color");
      },
      onSettled: (_, __, variables) => {
        queryClient.invalidateQueries({
          queryKey: ["bookmarks", "getBookmarksByFolderId", variables.folderId],
        });
      },
    })
  );

  const deleteBookmark = useMutation(
    trpc.bookmarks.deleteBookmark.mutationOptions({})
  );

  const moveBookmarkToFolder = useMutation(
    trpc.bookmarks.moveBookmarkToFolder.mutationOptions({})
  );

  const deleteAsset = useMutation(
    trpc.canvasAssets.deleteAsset.mutationOptions({})
  );

  const moveAssetToFolder = useMutation(
    trpc.canvasAssets.moveAssetToFolder.mutationOptions({})
  );

  useEffect(() => {
    pendingActionsRef.current = pendingActions;
  }, [pendingActions]);

  useEffect(() => {
    return () => {
      pendingActionTimersRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      pendingActionTimersRef.current.clear();
    };
  }, []);

  const clearPendingActionTimer = useCallback((actionId: string) => {
    const timeoutId = pendingActionTimersRef.current.get(actionId);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      pendingActionTimersRef.current.delete(actionId);
    }
  }, []);

  const removePendingAction = useCallback(
    (actionId: string) => {
      clearPendingActionTimer(actionId);
      setPendingActions((currentActions) =>
        currentActions.filter((action) => action.id !== actionId)
      );
    },
    [clearPendingActionTimer]
  );

  const undoPendingAction = useCallback(
    (actionId: string) => {
      toast.dismiss(actionId);
      removePendingAction(actionId);
    },
    [removePendingAction]
  );

  const invalidateBookmarkFolders = useCallback(
    async (folderIds: Array<string | undefined>) => {
      const uniqueFolderIds = Array.from(
        new Set(folderIds.filter(Boolean) as string[])
      );

      await Promise.all([
        ...uniqueFolderIds.map((folderId) =>
          queryClient.invalidateQueries({
            queryKey: ["bookmarks", "getBookmarksByFolderId", folderId],
          })
        ),
        queryClient.invalidateQueries({
          queryKey: ["folders", "getFolders"],
        }),
      ]);
    },
    []
  );

  const invalidateCanvasFolders = useCallback(
    async (folderIds: Array<string | undefined>) => {
      const uniqueFolderIds = Array.from(
        new Set(folderIds.filter(Boolean) as string[])
      );

      await Promise.all([
        ...uniqueFolderIds.map((folderId) =>
          queryClient.invalidateQueries({
            queryKey: ["canvasAssets", "getAssetsByFolderId", folderId],
          })
        ),
        queryClient.invalidateQueries({
          queryKey: ["folders", "getFolders"],
        }),
      ]);
    },
    []
  );

  const getPendingActionMessage = useCallback((action: PendingFolderAction) => {
    if (action.entity === "bookmark") {
      return action.operation === "delete"
        ? "Bookmark deleted"
        : "Bookmark moved";
    }

    return action.operation === "delete" ? "Asset deleted" : "Asset moved";
  }, []);

  const getPendingActionErrorMessage = useCallback(
    (action: PendingFolderAction) => {
      if (action.entity === "bookmark") {
        return action.operation === "delete"
          ? "Failed to delete bookmark"
          : "Failed to move bookmark";
      }

      return action.operation === "delete"
        ? "Failed to delete asset"
        : "Failed to move asset";
    },
    []
  );

  const commitPendingAction = useCallback(
    async (actionId: string) => {
      const action = pendingActionsRef.current.find(
        (currentAction) => currentAction.id === actionId
      );

      if (!action) {
        return;
      }

      clearPendingActionTimer(actionId);
      setPendingActions((currentActions) =>
        currentActions.map((currentAction) =>
          currentAction.id === actionId
            ? { ...currentAction, status: "committing" as const }
            : currentAction
        )
      );

      try {
        if (action.entity === "bookmark") {
          if (action.operation === "delete") {
            await deleteBookmark.mutateAsync(action.item.id);
          } else if (action.targetFolderId) {
            await moveBookmarkToFolder.mutateAsync({
              bookmarkId: action.item.id,
              folderId: action.targetFolderId,
            });
          }

          await invalidateBookmarkFolders([
            action.sourceFolderId,
            action.targetFolderId,
          ]);
          removePendingAction(actionId);
          return;
        }

        if (action.operation === "delete") {
          await deleteAsset.mutateAsync(action.item.id);
        } else if (action.targetFolderId) {
          await moveAssetToFolder.mutateAsync({
            assetId: action.item.id,
            folderId: action.targetFolderId,
          });
        }

        await invalidateCanvasFolders([
          action.sourceFolderId,
          action.targetFolderId,
        ]);
        removePendingAction(actionId);
      } catch {
        removePendingAction(actionId);

        if (action.entity === "bookmark") {
          await invalidateBookmarkFolders([
            action.sourceFolderId,
            action.targetFolderId,
          ]);
        } else {
          await invalidateCanvasFolders([
            action.sourceFolderId,
            action.targetFolderId,
          ]);
        }

        toast.error(getPendingActionErrorMessage(action));
      }
    },
    [
      clearPendingActionTimer,
      deleteAsset,
      deleteBookmark,
      getPendingActionErrorMessage,
      invalidateBookmarkFolders,
      invalidateCanvasFolders,
      moveAssetToFolder,
      moveBookmarkToFolder,
      removePendingAction,
    ]
  );

  const stagePendingAction = useCallback(
    (action: Omit<PendingFolderAction, "stagedAt" | "status">) => {
      const isAlreadyPending = pendingActionsRef.current.some(
        (currentAction) =>
          currentAction.entity === action.entity &&
          currentAction.item.id === action.item.id
      );

      if (isAlreadyPending) {
        return;
      }

      const nextAction: PendingFolderAction = {
        ...action,
        stagedAt: Date.now(),
        status: "pending",
      } as PendingFolderAction;

      setPendingActions((currentActions) => [...currentActions, nextAction]);

      toast.custom(
        () => (
          <UndoToast
            message={getPendingActionMessage(nextAction)}
            onUndo={() => undoPendingAction(nextAction.id)}
          />
        ),
        {
          id: nextAction.id,
          duration: UNDO_WINDOW_MS,
          position: nextAction.entity === "asset" ? "top-center" : undefined,
        }
      );

      const timeoutId = window.setTimeout(() => {
        void commitPendingAction(nextAction.id);
      }, UNDO_WINDOW_MS);

      pendingActionTimersRef.current.set(nextAction.id, timeoutId);
    },
    [commitPendingAction, getPendingActionMessage, undoPendingAction]
  );

  const stageBookmarkDelete = useCallback(
    (bookmark: BookmarkRecord) => {
      stagePendingAction({
        id: crypto.randomUUID(),
        entity: "bookmark",
        operation: "delete",
        item: bookmark,
        sourceFolderId: bookmark.folderId,
      });
    },
    [stagePendingAction]
  );

  const stageBookmarkMove = useCallback(
    (bookmark: BookmarkRecord, folderId: string) => {
      stagePendingAction({
        id: crypto.randomUUID(),
        entity: "bookmark",
        operation: "move",
        item: bookmark,
        sourceFolderId: bookmark.folderId,
        targetFolderId: folderId,
      });
    },
    [stagePendingAction]
  );

  const stageAssetDelete = useCallback(
    (asset: CanvasAssetType) => {
      stagePendingAction({
        id: crypto.randomUUID(),
        entity: "asset",
        operation: "delete",
        item: asset,
        sourceFolderId: asset.folderId,
      });
    },
    [stagePendingAction]
  );

  const stageAssetMove = useCallback(
    (asset: CanvasAssetType, folderId: string) => {
      stagePendingAction({
        id: crypto.randomUUID(),
        entity: "asset",
        operation: "move",
        item: asset,
        sourceFolderId: asset.folderId,
        targetFolderId: folderId,
      });
    },
    [stagePendingAction]
  );

  const showInvalidBookmarkInput = useCallback(() => {
    setIsInvalidUrl(true);
    setTimeout(() => {
      setIsInvalidUrl(false);
    }, 2000);
  }, []);

  const submitBookmarkValue = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();

      if (!selectedFolder || isCanvasFolder || !value) {
        return false;
      }

      if (isValidColor(value)) {
        setUrl("");
        createColorBookmark.mutate({
          color: value,
          folderId: selectedFolder.id,
        });
        return true;
      }

      if (isValidURL(value)) {
        setUrl("");
        createBookmark.mutate({
          url: addHttpIfMissing(value),
          folderId: selectedFolder.id,
        });
        return true;
      }

      return false;
    },
    [
      selectedFolder,
      isCanvasFolder,
      createColorBookmark,
      createBookmark,
      setUrl,
    ]
  );

  useHotkeys("v", () => setShowOgImage((current) => !current));
  useHotkeys("m", () => setShowMonths((current) => !current));
  useHotkeys("t", () => setTheme(theme === "dark" ? "light" : "dark"));
  useHotkeys("w", () => {
    if (isCanvasFolder) canvasControls.setFullWidth(!canvasControls.fullWidth);
  });
  useHotkeys("c", () => {
    if (isCanvasFolder) canvasControls.setViewMode("canvas");
  });
  useHotkeys("g", () => {
    if (isCanvasFolder) canvasControls.setViewMode("masonry");
  });
  useHotkeys("r", () => {
    if (isCanvasFolder) canvasControls.setRounded(!canvasControls.rounded);
  });
  useHotkeys("s", () => {
    if (isCanvasFolder) canvasControls.setMoreSpace(!canvasControls.moreSpace);
  });
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

  useEffect(() => {
    saveShowMonthsPreference(showMonths);
  }, [showMonths]);

  useEffect(() => {
    saveShowOgImagePreference(showOgImage);
  }, [showOgImage]);

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

  useEffect(() => {
    if (!selectedFolder || isCanvasFolder) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented || isEditableElement(event.target)) {
        return;
      }

      const pastedText = event.clipboardData?.getData("text")?.trim();
      if (!pastedText) {
        return;
      }

      if (!isValidColor(pastedText) && !isValidURL(pastedText)) {
        return;
      }

      event.preventDefault();
      submitBookmarkValue(pastedText);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [selectedFolder?.id, isCanvasFolder, submitBookmarkValue]);

  const currentBookmarkActions = useMemo(
    () =>
      selectedFolder?.id
        ? pendingActions.filter(
            (action): action is PendingBookmarkAction =>
              isBookmarkPendingAction(action) &&
              (action.sourceFolderId === selectedFolder.id ||
                action.targetFolderId === selectedFolder.id)
          )
        : [],
    [pendingActions, selectedFolder?.id]
  );

  const currentAssetActions = useMemo(
    () =>
      selectedFolder?.id
        ? pendingActions.filter(
            (action): action is PendingAssetAction =>
              isAssetPendingAction(action) &&
              (action.sourceFolderId === selectedFolder.id ||
                action.targetFolderId === selectedFolder.id)
          )
        : [],
    [pendingActions, selectedFolder?.id]
  );

  const visibleBookmarks = useMemo(() => {
    if (!selectedFolder?.id) {
      return [];
    }

    return deriveVisibleBookmarks(
      (bookmarks.data?.pages.flat() ?? []) as BookmarkRecord[],
      selectedFolder.id,
      currentBookmarkActions
    );
  }, [bookmarks.data, currentBookmarkActions, selectedFolder?.id]);

  const pendingBookmarkIds = useMemo(
    () =>
      selectedFolder?.id
        ? getPendingItemIds(currentBookmarkActions, selectedFolder.id)
        : new Set<string>(),
    [currentBookmarkActions, selectedFolder?.id]
  );

  // Memoized filtered bookmarks for performance
  const filteredAndGroupedBookmarks = useMemo(() => {
    const filteredBookmarks = searchQuery
      ? visibleBookmarks.filter(
          (bookmark) =>
            bookmark.url?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bookmark.description
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            bookmark.color?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : visibleBookmarks;

    return groupBookmarksByMonth(filteredBookmarks);
  }, [searchQuery, visibleBookmarks]);

  useEffect(() => {
    if (!session?.user && !isSessionPending) {
      router.push("/");
    }
  }, [session?.user, isSessionPending]);

  return (
    <>
      <div className="z-10 top-0">
        <div className="md:fixed absolute md:left-8 md:top-8 left-4 top-6">
          <SelectFolder
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
            folders={folders.data ?? []}
          />
        </div>
        <div className="md:fixed absolute md:right-8 md:top-8 right-6 top-6 flex items-center gap-2">
          <ShareFolder
            selectedFolder={selectedFolder}
            setSelectedFolder={setSelectedFolder}
          />
          <UserMenu
            showMonths={showMonths}
            setShowMonths={setShowMonths}
            showOgImage={showOgImage}
            setShowOgImage={setShowOgImage}
            isCanvasFolder={isCanvasFolder}
            canvasControls={isCanvasFolder ? canvasControls : undefined}
          />
        </div>
      </div>
      <div
        className={`container mx-auto ${
          isCanvasFolder && canvasControls.viewMode === "canvas"
            ? "max-w-full px-0 pb-0 pt-0 md:pt-0"
            : isCanvasFolder && canvasControls.fullWidth
            ? "max-w-full md:px-8 pt-20 md:pt-24 px-6"
            : isCanvasFolder
            ? "max-w-6xl pt-20 md:pt-32 md:px-0 px-6"
            : "max-w-2xl px-4 pb-36 pt-20 md:pt-32"
        }`}
      >
        <div className={`grid  ${isCanvasFolder ? "h-full" : ""}`}>
          {folders.isSuccess && folders.data && folders.data.length === 0 && (
            <div className="flex flex-col justify-center items-center min-h-[70vh]">
              <CreateFirstFolder setSelectedFolder={setSelectedFolder} />
            </div>
          )}
          {isCanvasFolder && selectedFolder ? (
            <CanvasFolderView
              folderId={selectedFolder.id}
              canvasControls={canvasControls}
              folders={folders.data ?? []}
              pendingActions={currentAssetActions}
              onDeleteAsset={stageAssetDelete}
              onMoveAsset={stageAssetMove}
            />
          ) : (
            <>
              {folders.isSuccess && folders.data && folders.data.length > 0 && (
                <div className="relative h-9">
                  <Input
                    placeholder="https://"
                    className={cn(
                      "dark:bg-neutral-900",
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
                        if (!submitBookmarkValue(url)) {
                          showInvalidBookmarkInput();
                        }
                      }
                    }}
                    onPaste={(e) => {
                      const pastedText = e.clipboardData.getData("text");
                      if (!pastedText.trim()) {
                        return;
                      }

                      if (submitBookmarkValue(pastedText)) {
                        e.preventDefault();
                      } else {
                        showInvalidBookmarkInput();
                      }
                    }}
                  />

                  <AnimatePresence>
                    {isInvalidUrl && (
                      <motion.div
                        key="invalid-url"
                        initial={{
                          opacity: 0,
                          x: 16,
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
                          x: 16,
                          filter: "blur(4px)",
                          scale: 0.97,
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="absolute text-destructive text-sm right-3 top-1/2 -translate-y-1/2"
                      >
                        Invalid URL
                      </motion.div>
                    )}
                    {!isInvalidUrl && !isBookmarkAdded && (
                      <motion.div
                        key="shortcut-hint"
                        initial={{
                          opacity: 0,
                          x: 16,
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
                          x: 16,
                          filter: "blur(4px)",
                          scale: 0.97,
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="absolute flex items-center gap-2 right-3 top-1/2 -translate-y-1/2"
                      >
                        <Shortcut>Shift</Shortcut>
                        <Shortcut>F</Shortcut>
                      </motion.div>
                    )}
                    {isBookmarkAdded && (
                      <motion.div
                        key="bookmark-added"
                        initial={{
                          opacity: 0,
                          x: 16,
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
                          x: 16,
                          filter: "blur(4px)",
                          scale: 0.97,
                        }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
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
                visibleBookmarks.length === 0 && (
                  <div className="mt-24">
                    <EmptyState
                      title="No bookmarks here"
                      Icon={BookmarkIcon}
                      description="Add some cool links to get started"
                    />
                  </div>
                )}

              {filteredAndGroupedBookmarks.map(
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
                                  bookmark={bookmark}
                                  showOgImage={showOgImage}
                                  isPublicPage={false}
                                  folders={folders.data ?? []}
                                  onDelete={stageBookmarkDelete}
                                  onMove={stageBookmarkMove}
                                  isActionPending={pendingBookmarkIds.has(
                                    bookmark.id
                                  )}
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
