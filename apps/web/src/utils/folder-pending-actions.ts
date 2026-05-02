import type { ItemRecord } from "@/types/items";

type PendingActionStatus = "pending" | "committing";

type PendingActionBase = {
  id: string;
  sourceFolderId: string;
  targetFolderId?: string;
  stagedAt: number;
  status: PendingActionStatus;
};

export type PendingItemAction = PendingActionBase & {
  entity: "item";
  operation: "delete" | "move";
  item: ItemRecord;
};

export type BookmarkRecord = ItemRecord;
export type PendingBookmarkAction = PendingItemAction;
export type PendingAssetAction = PendingItemAction;
export type PendingFolderAction = PendingItemAction;

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

export function deriveVisibleItems(
  items: ItemRecord[],
  folderId: string,
  actions: PendingItemAction[]
) {
  const hiddenItemIds = new Set(
    actions
      .filter(
        (action) =>
          action.operation === "delete" || action.sourceFolderId === folderId
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
      gridSortOrder: -1,
      canvasX: null,
      canvasY: null,
      canvasWidth: null,
      canvasHeight: null,
    }));

  return uniqueById([
    ...movedIntoFolder,
    ...items.filter((item) => !hiddenItemIds.has(item.id)),
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
