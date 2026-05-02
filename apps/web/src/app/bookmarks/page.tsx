"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { BookmarkIcon, Check, LayoutDashboard } from "lucide-react";
import { Bookmark } from "@/components/bookmark";
import { AssetUploadZone } from "@/components/canvas/asset-upload-zone";
import { CanvasView } from "@/components/canvas/canvas-view";
import { MasonryGrid } from "@/components/canvas/masonry-grid";
import { EmptyState } from "@/components/empty-state";
import { CreateFirstFolder } from "@/components/folders/create-first-folder";
import { SelectFolder } from "@/components/folders/select-folder";
import ShareFolder from "@/components/folders/share-folder";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Shortcut } from "@/components/ui/shortcut";
import { UndoToast } from "@/components/ui/undo-toast";
import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { isEditableElement } from "@/utils/is-editable-element";
import { groupItemsByMonth } from "@/utils/get-items-by-month";
import {
  canvasItemsQueryKey,
  gridItemsQueryKey,
  listItemsQueryKey,
} from "@/utils/item-query-keys";
import {
  deriveVisibleItems,
  getPendingItemIds,
  type PendingFolderAction,
  type PendingItemAction,
} from "@/utils/folder-pending-actions";
import {
  getFolderViewPreference,
  getLastFolderId,
  getShowMonthsPreference,
  getShowOgImagePreference,
  saveFolderViewPreference,
  saveLastFolderId,
  saveShowMonthsPreference,
  saveShowOgImagePreference,
} from "@/utils/local-storage";
import { queryClient, trpc, trpcClient } from "@/utils/trpc";
import { addHttpIfMissing, isValidURL } from "@/utils/url-validator";
import { isValidColor } from "@/utils/color-validator";
import type { FolderRecord, FolderView, ItemRecord } from "@/types/items";

export type Folder = FolderRecord;

const PAGE_SIZE = 50;
const UNDO_WINDOW_MS = 5000;
const GRID_COLUMNS_KEY = "vayo-canvas-columns";
const GRID_FULL_WIDTH_KEY = "vayo-canvas-full-width";
const GRID_MORE_SPACE_KEY = "vayo-canvas-more-space";
const GRID_ROUNDED_KEY = "vayo-canvas-rounded";

function getStoredNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  const parsed = parseInt(stored, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

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

function buildOptimisticItem({
  id,
  folderId,
  type,
  title,
  url,
  color,
}: {
  id: string;
  folderId: string;
  type: ItemRecord["type"];
  title: string;
  url: string | null;
  color: string | null;
}): ItemRecord {
  const now = new Date().toISOString();

  return {
    id,
    _temp: true,
    folderId,
    createdAt: now,
    updatedAt: now,
    type,
    title,
    url,
    color,
    faviconUrl: null,
    ogImageUrl: null,
    description: null,
    summary: null,
    mimeType: null,
    fileSize: null,
    width: null,
    height: null,
    originalFilename: null,
    gridSortOrder: -1,
    canvasX: null,
    canvasY: null,
    canvasWidth: null,
    canvasHeight: null,
    canvasZIndex: 0,
  };
}

function updateInfiniteItemsCache(
  queryKey: readonly unknown[],
  updater: (items: ItemRecord[]) => ItemRecord[]
) {
  queryClient.setQueryData(queryKey, (old: any) => {
    if (!old) {
      return {
        pages: [updater([])],
        pageParams: [1],
      };
    }

    return {
      ...old,
      pages: old.pages.map((page: ItemRecord[], index: number) =>
        index === 0 ? updater(page) : page
      ),
    };
  });
}

function insertOptimisticItem(folderId: string, item: ItemRecord) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) => [
    item,
    ...items,
  ]);
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) => [
    item,
    ...items,
  ]);
  queryClient.setQueryData(
    canvasItemsQueryKey(folderId),
    (old: ItemRecord[] | undefined) => (old ? [item, ...old] : [item])
  );
}

function replaceOptimisticItem(
  folderId: string,
  tempId: string,
  nextItem: ItemRecord
) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) =>
    items.map((item) => (item.id === tempId ? nextItem : item))
  );
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) =>
    items.map((item) => (item.id === tempId ? nextItem : item))
  );
  queryClient.setQueryData(
    canvasItemsQueryKey(folderId),
    (old: ItemRecord[] | undefined) =>
      old?.map((item) => (item.id === tempId ? nextItem : item))
  );
}

function removeOptimisticItem(folderId: string, tempId: string) {
  updateInfiniteItemsCache(listItemsQueryKey(folderId), (items) =>
    items.filter((item) => item.id !== tempId)
  );
  updateInfiniteItemsCache(gridItemsQueryKey(folderId), (items) =>
    items.filter((item) => item.id !== tempId)
  );
  queryClient.setQueryData(
    canvasItemsQueryKey(folderId),
    (old: ItemRecord[] | undefined) => old?.filter((item) => item.id !== tempId)
  );
}

function sortByNewest(items: ItemRecord[]) {
  return [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function matchesSearch(item: ItemRecord, query: string) {
  if (!query) return true;

  const lowerQuery = query.toLowerCase();
  return [
    item.title,
    item.description,
    item.url,
    item.originalFilename,
    item.color,
    item.mimeType,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(lowerQuery));
}

function getLinkTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function useFolderDisplayControls(
  viewMode: FolderView,
  setViewMode: (mode: FolderView) => void
) {
  const [columns, setColumns] = useState(() =>
    getStoredNumber(GRID_COLUMNS_KEY, 3)
  );
  const [fullWidth, setFullWidth] = useState(() =>
    getStoredBoolean(GRID_FULL_WIDTH_KEY, false)
  );
  const [moreSpace, setMoreSpace] = useState(() =>
    getStoredBoolean(GRID_MORE_SPACE_KEY, false)
  );
  const [rounded, setRounded] = useState(() =>
    getStoredBoolean(GRID_ROUNDED_KEY, true)
  );

  useEffect(() => {
    localStorage.setItem(GRID_COLUMNS_KEY, columns.toString());
  }, [columns]);

  useEffect(() => {
    localStorage.setItem(GRID_FULL_WIDTH_KEY, fullWidth.toString());
  }, [fullWidth]);

  useEffect(() => {
    localStorage.setItem(GRID_MORE_SPACE_KEY, moreSpace.toString());
  }, [moreSpace]);

  useEffect(() => {
    localStorage.setItem(GRID_ROUNDED_KEY, rounded.toString());
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

export default function Bookmarks() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pendingActionTimersRef = useRef<Map<string, number>>(new Map());
  const pendingActionsRef = useRef<PendingFolderAction[]>([]);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  const [inputValue, setInputValue] = useState("");
  const deferredInputValue = useDeferredValue(inputValue);
  const [showMonths, setShowMonths] = useState(getShowMonthsPreference);
  const [showOgImage, setShowOgImage] = useState(getShowOgImagePreference);
  const [isItemAdded, setIsItemAdded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [currentView, setCurrentView] = useState<FolderView>("list");
  const [pendingActions, setPendingActions] = useState<PendingFolderAction[]>(
    []
  );
  const [previewItem, setPreviewItem] = useState<ItemRecord | null>(null);

  const displayControls = useFolderDisplayControls(currentView, setCurrentView);
  const searchQuery = deferredInputValue.trim();

  const folders = useQuery(trpc.folders.getFolders.queryOptions());

  const listItems = useInfiniteQuery({
    queryKey: selectedFolder?.id
      ? listItemsQueryKey(selectedFolder.id)
      : ["items", "folder", "none", "list"],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return trpcClient.items.getItemsByFolderId.query({
        folderId: selectedFolder!.id,
        page: pageParam,
        view: "list",
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    enabled: Boolean(selectedFolder?.id) && currentView === "list",
  });

  const gridItems = useInfiniteQuery({
    queryKey: selectedFolder?.id
      ? gridItemsQueryKey(selectedFolder.id)
      : ["items", "folder", "none", "grid"],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      return trpcClient.items.getItemsByFolderId.query({
        folderId: selectedFolder!.id,
        page: pageParam,
        view: "grid",
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any[], allPages: any[][]) => {
      return lastPage.length === PAGE_SIZE ? allPages.length + 1 : undefined;
    },
    enabled: Boolean(selectedFolder?.id) && currentView === "grid",
  });

  const canvasItems = useQuery({
    queryKey: selectedFolder?.id
      ? canvasItemsQueryKey(selectedFolder.id)
      : ["items", "folder", "none", "canvas"],
    queryFn: async () => {
      return trpcClient.items.getCanvasItemsByFolderId.query({
        folderId: selectedFolder!.id,
      });
    },
    enabled: Boolean(selectedFolder?.id) && currentView === "canvas",
  });

  const updateDefaultView = useMutation(
    trpc.folders.updateDefaultView.mutationOptions({
      onSuccess: (data) => {
        const nextFolder = data[0];
        if (!nextFolder) return;

        queryClient.setQueryData(
          trpc.folders.getFolders.queryKey(),
          (old: Folder[] | undefined) =>
            old?.map((folder) =>
              folder.id === nextFolder.id
                ? {
                    ...folder,
                    defaultView: nextFolder.defaultView,
                    updatedAt: nextFolder.updatedAt,
                  }
                : folder
            )
        );
      },
    })
  );

  const createLink = useMutation(
    trpc.items.createLink.mutationOptions({
      onMutate: async ({ url, folderId }) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticItem = buildOptimisticItem({
          id: tempId,
          folderId,
          type: "link",
          title: getLinkTitle(url),
          url,
          color: null,
        });

        setIsItemAdded(true);
        window.setTimeout(() => setIsItemAdded(false), 2000);
        insertOptimisticItem(folderId, optimisticItem);

        return { folderId, tempId };
      },
      onSuccess: (item, _variables, context) => {
        if (!context) return;
        replaceOptimisticItem(
          context.folderId,
          context.tempId,
          normalizeItem(item)
        );
      },
      onError: (_error, _variables, context) => {
        if (!context) return;
        removeOptimisticItem(context.folderId, context.tempId);
        toast.error("Failed to create link");
      },
      onSettled: (_result, _error, variables) => {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: listItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: gridItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: canvasItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: ["folders", "getFolders"],
          }),
        ]);
      },
    })
  );

  const createColor = useMutation(
    trpc.items.createColor.mutationOptions({
      onMutate: async ({ color, folderId }) => {
        const tempId = `temp-${Date.now()}-${Math.random()}`;
        const optimisticItem = buildOptimisticItem({
          id: tempId,
          folderId,
          type: "color",
          title: color,
          url: null,
          color,
        });

        setIsItemAdded(true);
        window.setTimeout(() => setIsItemAdded(false), 2000);
        insertOptimisticItem(folderId, optimisticItem);

        return { folderId, tempId };
      },
      onSuccess: (item, _variables, context) => {
        if (!context) return;
        replaceOptimisticItem(
          context.folderId,
          context.tempId,
          normalizeItem(item)
        );
      },
      onError: (_error, _variables, context) => {
        if (!context) return;
        removeOptimisticItem(context.folderId, context.tempId);
        toast.error("Failed to create color");
      },
      onSettled: (_result, _error, variables) => {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: listItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: gridItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: canvasItemsQueryKey(variables.folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: ["folders", "getFolders"],
          }),
        ]);
      },
    })
  );

  const deleteItem = useMutation(trpc.items.deleteItem.mutationOptions({}));
  const moveItemToFolder = useMutation(
    trpc.items.moveItemToFolder.mutationOptions({})
  );
  const updateGridSortOrder = useMutation(
    trpc.items.updateGridSortOrder.mutationOptions({
      onSettled: (_result, _error, updates) => {
        const folderId = selectedFolder?.id;
        if (!folderId || updates.length === 0) return;
        void queryClient.invalidateQueries({
          queryKey: gridItemsQueryKey(folderId),
        });
      },
    })
  );
  const updateCanvasZIndex = useMutation(
    trpc.items.updateCanvasZIndex.mutationOptions({
      onSettled: () => {
        if (!selectedFolder?.id) return;
        void queryClient.invalidateQueries({
          queryKey: canvasItemsQueryKey(selectedFolder.id),
        });
      },
    })
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

  const undoLatestPendingAction = useCallback(() => {
    const latestPendingAction = [...pendingActionsRef.current]
      .reverse()
      .find((action) => action.status === "pending");

    if (!latestPendingAction) {
      return false;
    }

    undoPendingAction(latestPendingAction.id);
    return true;
  }, [undoPendingAction]);

  const invalidateFolderData = useCallback(
    async (folderIds: Array<string | undefined>) => {
      const uniqueFolderIds = Array.from(
        new Set(folderIds.filter(Boolean) as string[])
      );

      await Promise.all([
        ...uniqueFolderIds.flatMap((folderId) => [
          queryClient.invalidateQueries({
            queryKey: listItemsQueryKey(folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: gridItemsQueryKey(folderId),
          }),
          queryClient.invalidateQueries({
            queryKey: canvasItemsQueryKey(folderId),
          }),
        ]),
        queryClient.invalidateQueries({ queryKey: ["folders", "getFolders"] }),
      ]);
    },
    []
  );

  const commitPendingAction = useCallback(
    async (actionId: string) => {
      const action = pendingActionsRef.current.find(
        (currentAction) => currentAction.id === actionId
      );
      if (!action) return;

      clearPendingActionTimer(actionId);
      setPendingActions((currentActions) =>
        currentActions.map((currentAction) =>
          currentAction.id === actionId
            ? { ...currentAction, status: "committing" as const }
            : currentAction
        )
      );

      try {
        if (action.operation === "delete") {
          await deleteItem.mutateAsync(action.item.id);
        } else if (action.targetFolderId) {
          await moveItemToFolder.mutateAsync({
            itemId: action.item.id,
            folderId: action.targetFolderId,
          });
        }

        await invalidateFolderData([
          action.sourceFolderId,
          action.targetFolderId,
        ]);
        removePendingAction(actionId);
      } catch {
        removePendingAction(actionId);
        await invalidateFolderData([
          action.sourceFolderId,
          action.targetFolderId,
        ]);
        toast.error(
          action.operation === "delete"
            ? "Failed to delete item"
            : "Failed to move item"
        );
      }
    },
    [
      clearPendingActionTimer,
      deleteItem,
      invalidateFolderData,
      moveItemToFolder,
      removePendingAction,
    ]
  );

  const stagePendingAction = useCallback(
    (action: Omit<PendingFolderAction, "stagedAt" | "status">) => {
      const isAlreadyPending = pendingActionsRef.current.some(
        (currentAction) => currentAction.item.id === action.item.id
      );

      if (isAlreadyPending) return;

      const nextAction: PendingFolderAction = {
        ...action,
        stagedAt: Date.now(),
        status: "pending",
      };

      setPendingActions((currentActions) => [...currentActions, nextAction]);

      toast.custom(
        () => (
          <UndoToast
            message={
              action.operation === "delete" ? "Item deleted" : "Item moved"
            }
            onUndo={() => undoPendingAction(nextAction.id)}
          />
        ),
        {
          id: nextAction.id,
          duration: UNDO_WINDOW_MS,
          position: "top-center",
        }
      );

      const timeoutId = window.setTimeout(() => {
        void commitPendingAction(nextAction.id);
      }, UNDO_WINDOW_MS);

      pendingActionTimersRef.current.set(nextAction.id, timeoutId);
    },
    [commitPendingAction, undoPendingAction]
  );

  const setFolderView = useCallback(
    (nextView: FolderView) => {
      if (!selectedFolder) return;

      setCurrentView(nextView);
      saveFolderViewPreference(selectedFolder.id, nextView);

      setSelectedFolder((currentFolder) =>
        currentFolder
          ? { ...currentFolder, defaultView: nextView }
          : currentFolder
      );

      queryClient.setQueryData(
        trpc.folders.getFolders.queryKey(),
        (old: Folder[] | undefined) =>
          old?.map((folder) =>
            folder.id === selectedFolder.id
              ? { ...folder, defaultView: nextView }
              : folder
          )
      );

      updateDefaultView.mutate({
        id: selectedFolder.id,
        defaultView: nextView,
      });
    },
    [selectedFolder, updateDefaultView]
  );

  useHotkeys("l", () => selectedFolder && setFolderView("list"));
  useHotkeys("g", () => selectedFolder && setFolderView("grid"));
  useHotkeys("c", () => selectedFolder && setFolderView("canvas"));
  useHotkeys("v", () => setShowOgImage((current) => !current));
  useHotkeys("m", () => setShowMonths((current) => !current));
  useHotkeys("t", () => setTheme(theme === "dark" ? "light" : "dark"));
  useHotkeys("w", () => {
    if (currentView === "grid") {
      displayControls.setFullWidth(!displayControls.fullWidth);
    }
  });
  useHotkeys("r", () => {
    if (currentView !== "list") {
      displayControls.setRounded(!displayControls.rounded);
    }
  });
  useHotkeys("s", () => {
    if (currentView === "grid") {
      displayControls.setMoreSpace(!displayControls.moreSpace);
    }
  });
  useHotkeys("shift+f", (event) => {
    event.preventDefault();
    inputRef.current?.focus();
  });

  useEffect(() => {
    const handleUndoHotkey = (event: KeyboardEvent) => {
      const isUndoShortcut =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "z";

      if (
        !isUndoShortcut ||
        event.defaultPrevented ||
        event.repeat ||
        isEditableElement(event.target)
      ) {
        return;
      }

      if (undoLatestPendingAction()) {
        event.preventDefault();
      }
    };

    window.addEventListener("keydown", handleUndoHotkey);
    return () => window.removeEventListener("keydown", handleUndoHotkey);
  }, [undoLatestPendingAction]);

  useEffect(() => {
    if (
      folders.isSuccess &&
      folders.data &&
      folders.data.length > 0 &&
      !selectedFolder?.id
    ) {
      const lastFolderId = getLastFolderId();
      if (lastFolderId) {
        const lastFolder = folders.data.find(
          (folder) => folder.id === lastFolderId
        );
        if (lastFolder) {
          setSelectedFolder(lastFolder);
          return;
        }
      }

      setSelectedFolder(folders.data[0]);
    }
  }, [folders.data, folders.isSuccess, selectedFolder?.id]);

  useEffect(() => {
    if (!selectedFolder) return;
    saveLastFolderId(selectedFolder.id);
    setCurrentView(
      getFolderViewPreference(
        selectedFolder.id,
        selectedFolder.defaultView,
        selectedFolder.type
      )
    );
  }, [selectedFolder?.defaultView, selectedFolder?.id, selectedFolder?.type]);

  useEffect(() => {
    saveShowMonthsPreference(showMonths);
  }, [showMonths]);

  useEffect(() => {
    saveShowOgImagePreference(showOgImage);
  }, [showOgImage]);

  const submitInputValue = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();
      if (!selectedFolder || !value) {
        return false;
      }

      if (isValidColor(value)) {
        setInputValue("");
        createColor.mutate({
          color: value,
          folderId: selectedFolder.id,
        });
        return true;
      }

      if (isValidURL(value)) {
        setInputValue("");
        createLink.mutate({
          url: addHttpIfMissing(value),
          folderId: selectedFolder.id,
        });
        return true;
      }

      return false;
    },
    [createColor, createLink, selectedFolder]
  );

  useEffect(() => {
    if (!selectedFolder) {
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
      submitInputValue(pastedText);
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [selectedFolder?.id, submitInputValue]);

  const currentActions = useMemo(
    () =>
      selectedFolder?.id
        ? pendingActions.filter(
            (action) =>
              action.sourceFolderId === selectedFolder.id ||
              action.targetFolderId === selectedFolder.id
          )
        : [],
    [pendingActions, selectedFolder?.id]
  );

  const visibleListItems = useMemo(() => {
    if (!selectedFolder?.id) return [];

    const items = (listItems.data?.pages.flat() ?? []).map(normalizeItem);
    return sortByNewest(
      deriveVisibleItems(items, selectedFolder.id, currentActions).filter(
        (item) => matchesSearch(item, searchQuery)
      )
    );
  }, [currentActions, listItems.data, searchQuery, selectedFolder?.id]);

  const visibleGridItems = useMemo(() => {
    if (!selectedFolder?.id) return [];

    const items = (gridItems.data?.pages.flat() ?? []).map(normalizeItem);
    return deriveVisibleItems(items, selectedFolder.id, currentActions).filter(
      (item) => matchesSearch(item, searchQuery)
    );
  }, [currentActions, gridItems.data, searchQuery, selectedFolder?.id]);

  const visibleCanvasItems = useMemo(() => {
    if (!selectedFolder?.id) return [];

    const items = (canvasItems.data ?? []).map(normalizeItem);
    return deriveVisibleItems(items, selectedFolder.id, currentActions).filter(
      (item) => matchesSearch(item, searchQuery)
    );
  }, [canvasItems.data, currentActions, searchQuery, selectedFolder?.id]);

  const pendingItemIds = useMemo(
    () =>
      selectedFolder?.id
        ? getPendingItemIds(
            currentActions as PendingItemAction[],
            selectedFolder.id
          )
        : new Set<string>(),
    [currentActions, selectedFolder?.id]
  );

  const groupedListItems = useMemo(() => {
    return groupItemsByMonth(visibleListItems);
  }, [visibleListItems]);

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

  useEffect(() => {
    if (!session?.user && !isSessionPending) {
      router.push("/");
    }
  }, [isSessionPending, router, session?.user]);

  const isEmptyFolder =
    folders.isSuccess && folders.data && folders.data.length === 0;

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
                {"<"}
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
                {">"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
            canvasControls={{
              ...displayControls,
              setViewMode: setFolderView,
              viewMode: currentView,
            }}
          />
        </div>
      </div>

      <div
        className={`container mx-auto ${
          currentView === "canvas"
            ? "max-w-full px-0 pb-0 pt-0 md:pt-0"
            : currentView === "grid" && displayControls.fullWidth
            ? "max-w-full md:px-8 pt-20 md:pt-24 px-6"
            : currentView === "grid"
            ? "max-w-6xl pt-20 md:pt-32 md:px-0 px-6"
            : "max-w-2xl px-4 pb-36 pt-20 md:pt-32"
        }`}
      >
        <div className={`grid ${currentView === "canvas" ? "h-full" : ""}`}>
          {isEmptyFolder && (
            <div className="flex min-h-[70vh] flex-col items-center justify-center">
              <CreateFirstFolder setSelectedFolder={setSelectedFolder} />
            </div>
          )}

          {!isEmptyFolder && selectedFolder && (
            <>
              {currentView !== "canvas" && (
              <div className="relative h-9">
                <Input
                  ref={inputRef}
                  placeholder="Add anything or search..."
                  className={cn(
                    "dark:bg-neutral-900",
                    isItemAdded &&
                      "focus-visible:border-green-400 rounded-md focus-visible:ring-green-400/20 focus-visible:ring-2 dark:focus-visible:border-green-600 dark:focus-visible:ring-green-600/20"
                  )}
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submitInputValue(inputValue);
                    }
                  }}
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData("text");
                    if (!pastedText.trim()) {
                      return;
                    }

                    if (submitInputValue(pastedText)) {
                      event.preventDefault();
                    }
                  }}
                />

                <AnimatePresence>
                  {!isItemAdded && (
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
                      className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2"
                    >
                      <Shortcut>Shift</Shortcut>
                      <Shortcut>F</Shortcut>
                    </motion.div>
                  )}
                  {isItemAdded && (
                    <motion.div
                      key="item-added"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-green-400 dark:text-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              )}

              {currentView === "list" && !showMonths && (
                <hr className="mt-6 mb-2 opacity-50" />
              )}

              {currentView === "list" &&
                listItems.isSuccess &&
                visibleListItems.length === 0 && (
                  <div className="mt-24">
                    <EmptyState
                      title="No items here"
                      Icon={BookmarkIcon}
                      description="Add links, colors, images, or videos to get started"
                    />
                  </div>
                )}

              {currentView === "list" &&
                groupedListItems.map(([month, monthItems], monthIndex) => (
                  <div key={month} className="space-y-2">
                    {showMonths && (
                      <h2 className="mt-8 border-b border-neutral-200 px-2.5 pb-2 text-base font-medium dark:border-neutral-800">
                        {month}
                      </h2>
                    )}
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
                              showOgImage={showOgImage}
                              isPublicPage={false}
                              folders={folders.data ?? []}
                              onDelete={(nextItem) =>
                                stagePendingAction({
                                  id: crypto.randomUUID(),
                                  entity: "item",
                                  operation: "delete",
                                  item: nextItem,
                                  sourceFolderId: nextItem.folderId,
                                })
                              }
                              onMove={(nextItem, folderId) =>
                                stagePendingAction({
                                  id: crypto.randomUUID(),
                                  entity: "item",
                                  operation: "move",
                                  item: nextItem,
                                  sourceFolderId: nextItem.folderId,
                                  targetFolderId: folderId,
                                })
                              }
                              onPreview={setPreviewItem}
                              isActionPending={pendingItemIds.has(item.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {currentView === "grid" &&
                gridItems.isSuccess &&
                visibleGridItems.length === 0 && (
                  <div className="mt-24">
                    <EmptyState
                      title="No items here"
                      Icon={LayoutDashboard}
                      description="Drop media or save links to start building this folder"
                    />
                  </div>
                )}

              {currentView === "grid" && visibleGridItems.length > 0 && (
                <div className="space-y-4 md:pb-48 pb-32 mt-6">
                  <MasonryGrid
                    assets={visibleGridItems}
                    columns={displayControls.columns}
                    moreSpace={displayControls.moreSpace}
                    rounded={displayControls.rounded}
                    folderId={selectedFolder.id}
                    folders={folders.data ?? []}
                    onDelete={(item) =>
                      stagePendingAction({
                        id: crypto.randomUUID(),
                        entity: "item",
                        operation: "delete",
                        item,
                        sourceFolderId: item.folderId,
                      })
                    }
                    onMove={(item, folderId) =>
                      stagePendingAction({
                        id: crypto.randomUUID(),
                        entity: "item",
                        operation: "move",
                        item,
                        sourceFolderId: item.folderId,
                        targetFolderId: folderId,
                      })
                    }
                    onReorder={(reorderedItems) => {
                      updateGridSortOrder.mutate(
                        reorderedItems.map((item, index) => ({
                          id: item.id,
                          gridSortOrder: index,
                        }))
                      );
                    }}
                    onPreview={setPreviewItem}
                    pendingAssetIds={pendingItemIds}
                  />
                  <div ref={lastItemElementRef} className="h-1" />
                </div>
              )}

              {currentView === "canvas" &&
                canvasItems.isSuccess &&
                visibleCanvasItems.length === 0 && (
                  <div className="mt-64">
                    <EmptyState
                      title="No items here"
                      Icon={LayoutDashboard}
                      description="Drop media, links, or colors to build your canvas"
                    />
                  </div>
                )}

              {currentView === "canvas" && visibleCanvasItems.length > 0 && (
                <CanvasView
                  assets={visibleCanvasItems}
                  folderId={selectedFolder.id}
                  folders={folders.data ?? []}
                  rounded={displayControls.rounded}
                  onDelete={(item) =>
                    stagePendingAction({
                      id: crypto.randomUUID(),
                      entity: "item",
                      operation: "delete",
                      item,
                      sourceFolderId: item.folderId,
                    })
                  }
                  onMove={(item, folderId) =>
                    stagePendingAction({
                      id: crypto.randomUUID(),
                      entity: "item",
                      operation: "move",
                      item,
                      sourceFolderId: item.folderId,
                      targetFolderId: folderId,
                    })
                  }
                  onUpdateZIndex={(updates) =>
                    updateCanvasZIndex.mutate(updates)
                  }
                  onPreview={setPreviewItem}
                  pendingAssetIds={pendingItemIds}
                />
              )}

              <AssetUploadZone
                folderId={selectedFolder.id}
                floating={currentView === "canvas"}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
