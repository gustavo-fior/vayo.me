// localStorage utilities for last selected folder
const LAST_FOLDER_KEY = "vayo-last-folder-id";
const SHOW_MONTHS_KEY = "vayo-show-months";
const SHOW_OG_IMAGE_KEY = "vayo-show-og-image";

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
