export function listItemsQueryKey(folderId: string) {
  return ["items", "folder", folderId, "list"] as const;
}

export function gridItemsQueryKey(folderId: string) {
  return ["items", "folder", folderId, "grid"] as const;
}

export function canvasItemsQueryKey(folderId: string) {
  return ["items", "folder", folderId, "canvas"] as const;
}
