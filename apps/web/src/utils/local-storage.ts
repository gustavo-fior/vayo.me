// localStorage utilities for last selected folder
const LAST_FOLDER_KEY = "vayo-last-folder-id";
const SHOW_MONTHS_KEY = "vayo-show-months";
const SHOW_OG_IMAGE_KEY = "vayo-show-og-image";
const LEGACY_CANVAS_VIEW_KEY = "vayo-canvas-view";
const FOLDER_VIEW_KEY_PREFIX = "vayo-folder-view:";
const PUBLIC_FOLDER_VIEW_KEY_PREFIX = "vayo-public-folder-view:";

function getStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    return fallback;
  }

  return storedValue === "true";
}

function saveBoolean(key: string, value: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, value.toString());
  }
}

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

export const getShowMonthsPreference = () =>
  getStoredBoolean(SHOW_MONTHS_KEY, false);

export const saveShowMonthsPreference = (value: boolean) => {
  saveBoolean(SHOW_MONTHS_KEY, value);
};

export const getShowOgImagePreference = () =>
  getStoredBoolean(SHOW_OG_IMAGE_KEY, false);

export const saveShowOgImagePreference = (value: boolean) => {
  saveBoolean(SHOW_OG_IMAGE_KEY, value);
};

export function getFolderViewPreference(
  folderId: string,
  defaultView: "list" | "grid" | "canvas",
  legacyType?: "bookmarks" | "canvas"
) {
  if (typeof window === "undefined") {
    return defaultView;
  }

  const perFolderKey = `${FOLDER_VIEW_KEY_PREFIX}${folderId}`;
  const stored = localStorage.getItem(perFolderKey);
  if (stored === "list" || stored === "grid" || stored === "canvas") {
    return stored;
  }

  if (legacyType === "canvas") {
    const legacyView = localStorage.getItem(LEGACY_CANVAS_VIEW_KEY);
    const seededValue = legacyView === "canvas" ? "canvas" : "grid";
    localStorage.setItem(perFolderKey, seededValue);
    return seededValue;
  }

  return defaultView;
}

export function saveFolderViewPreference(
  folderId: string,
  view: "list" | "grid" | "canvas"
) {
  if (typeof window !== "undefined") {
    localStorage.setItem(`${FOLDER_VIEW_KEY_PREFIX}${folderId}`, view);
  }
}

export function getPublicFolderViewPreference(
  folderId: string,
  defaultView: "list" | "grid" | "canvas"
) {
  if (typeof window === "undefined") {
    return defaultView;
  }

  const stored = localStorage.getItem(`${PUBLIC_FOLDER_VIEW_KEY_PREFIX}${folderId}`);
  if (stored === "list" || stored === "grid" || stored === "canvas") {
    return stored;
  }

  return defaultView;
}

export function savePublicFolderViewPreference(
  folderId: string,
  view: "list" | "grid" | "canvas"
) {
  if (typeof window !== "undefined") {
    localStorage.setItem(`${PUBLIC_FOLDER_VIEW_KEY_PREFIX}${folderId}`, view);
  }
}
