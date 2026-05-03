export type FolderView = "list" | "grid" | "canvas";

export type FolderRecord = {
  id: string;
  name: string;
  icon: string | null;
  isShared: boolean;
  defaultView: FolderView;
  type?: "bookmarks" | "canvas";
  createdAt: string;
  updatedAt: string;
  userId: string;
  totalItems: number;
};

export type ItemType = "link" | "color" | "image" | "video";

export type ItemRecord = {
  id: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
  type: ItemType;
  title: string;
  url: string | null;
  color: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  description: string | null;
  summary: string | null;
  mimeType: string | null;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  originalFilename: string | null;
  gridSortOrder: number;
  canvasX: number | null;
  canvasY: number | null;
  canvasWidth: number | null;
  canvasHeight: number | null;
  canvasZIndex: number;
  _temp?: boolean;
};

export function isMediaItem(item: ItemRecord) {
  return item.type === "image" || item.type === "video";
}
