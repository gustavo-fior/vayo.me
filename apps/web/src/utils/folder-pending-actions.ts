import type { CanvasAssetType } from "@/components/canvas/asset-card";

export type BookmarkRecord = {
  id: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  folderId: string;
  url: string | null;
  type: "link" | "color";
  color: string | null;
};

type PendingActionStatus = "pending" | "committing";

type PendingActionBase = {
  id: string;
  sourceFolderId: string;
  targetFolderId?: string;
  stagedAt: number;
  status: PendingActionStatus;
};

export type PendingBookmarkAction = PendingActionBase & {
  entity: "bookmark";
  operation: "delete" | "move";
  item: BookmarkRecord;
};

export type PendingAssetAction = PendingActionBase & {
  entity: "asset";
  operation: "delete" | "move";
  item: CanvasAssetType;
};

export type PendingFolderAction = PendingBookmarkAction | PendingAssetAction;

function toTimestamp(value: string | Date) {
  return new Date(value).getTime();
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export function deriveVisibleBookmarks(
  bookmarks: BookmarkRecord[],
  folderId: string,
  actions: PendingBookmarkAction[]
) {
  const hiddenBookmarkIds = new Set(
    actions
      .filter(
        (action) =>
          action.operation === "delete" ||
          action.sourceFolderId === folderId
      )
      .map((action) => action.item.id)
  );

  const movedIntoFolder = actions
    .filter(
      (action) =>
        action.operation === "move" && action.targetFolderId === folderId
    )
    .map((action) => ({
      ...action.item,
      folderId,
      updatedAt: new Date(action.stagedAt).toISOString(),
    }));

  return uniqueById(
    [...bookmarks.filter((bookmark) => !hiddenBookmarkIds.has(bookmark.id)), ...movedIntoFolder].sort(
      (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
    )
  );
}

export function deriveVisibleAssets(
  assets: CanvasAssetType[],
  folderId: string,
  actions: PendingAssetAction[]
) {
  const hiddenAssetIds = new Set(
    actions
      .filter(
        (action) =>
          action.operation === "delete" ||
          action.sourceFolderId === folderId
      )
      .map((action) => action.item.id)
  );

  const movedIntoFolder = actions
    .filter(
      (action) =>
        action.operation === "move" && action.targetFolderId === folderId
    )
    .sort((a, b) => b.stagedAt - a.stagedAt)
    .map((action) => ({
      ...action.item,
      folderId,
      updatedAt: new Date(action.stagedAt).toISOString(),
    }));

  return uniqueById([
    ...movedIntoFolder,
    ...assets.filter((asset) => !hiddenAssetIds.has(asset.id)),
  ]);
}

export function getPendingItemIds<T extends PendingFolderAction>(
  actions: T[],
  folderId: string
) {
  return new Set(
    actions
      .filter(
        (action) =>
          action.sourceFolderId === folderId || action.targetFolderId === folderId
      )
      .map((action) => action.item.id)
  );
}
