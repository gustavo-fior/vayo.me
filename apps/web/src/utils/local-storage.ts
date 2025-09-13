// localStorage utilities for last selected folder
const LAST_FOLDER_KEY = "vayo-last-folder-id";

export const saveLastFolderId = (folderId: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_FOLDER_KEY, folderId);
  }
};

export const getLastFolderId = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(LAST_FOLDER_KEY);
  }
  return null;
};
