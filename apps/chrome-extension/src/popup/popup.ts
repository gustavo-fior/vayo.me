import { getSession } from "../lib/auth";
import { getFolders, createBookmark, createAsset, type Folder } from "../lib/api";
import { APP_URL } from "../lib/config";

// Screens
const screenLoading = document.getElementById("screen-loading")!;
const screenAuth = document.getElementById("screen-auth")!;
const screenBookmark = document.getElementById("screen-bookmark")!;
const screenAsset = document.getElementById("screen-asset")!;
const screenSuccess = document.getElementById("screen-success")!;
const screenError = document.getElementById("screen-error")!;

// Elements
const btnSignin = document.getElementById("btn-signin") as HTMLButtonElement;
const btnSaveBookmark = document.getElementById("btn-save-bookmark") as HTMLButtonElement;
const btnSaveAsset = document.getElementById("btn-save-asset") as HTMLButtonElement;
const btnRetry = document.getElementById("btn-retry") as HTMLButtonElement;
const bookmarkFavicon = document.getElementById("bookmark-favicon") as HTMLImageElement;
const bookmarkTitle = document.getElementById("bookmark-title")!;
const bookmarkUrl = document.getElementById("bookmark-url")!;
const bookmarkFolderSelect = document.getElementById("bookmark-folder") as HTMLSelectElement;
const assetPreviewImg = document.getElementById("asset-preview-img") as HTMLImageElement;
const assetPreviewVideo = document.getElementById("asset-preview-video") as HTMLVideoElement;
const assetFolderSelect = document.getElementById("asset-folder") as HTMLSelectElement;
const errorMessage = document.getElementById("error-message")!;

type PendingAsset = { url: string; assetType: "image" | "video" };
let pendingAsset: PendingAsset | null = null;

function showScreen(screen: HTMLElement) {
  [screenLoading, screenAuth, screenBookmark, screenAsset, screenSuccess, screenError].forEach(
    (s) => s.classList.add("hidden")
  );
  screen.classList.remove("hidden");
}

function showError(msg: string) {
  errorMessage.textContent = msg;
  showScreen(screenError);
}

function populateSelect(select: HTMLSelectElement, folders: Folder[], storageKey: string) {
  select.innerHTML = "";
  folders.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.icon ? `${f.icon} ${f.name}` : f.name;
    select.appendChild(opt);
  });

  // Restore last-used folder
  chrome.storage.local.get(storageKey, (data) => {
    const lastId = data[storageKey];
    if (lastId && folders.some((f) => f.id === lastId)) {
      select.value = lastId;
    }
  });
}

async function init() {
  showScreen(screenLoading);

  const session = await getSession();
  if (!session) {
    showScreen(screenAuth);
    return;
  }

  let folders: Folder[];
  try {
    folders = await getFolders();
  } catch {
    showError("Failed to load folders.");
    return;
  }

  // Check for pending asset from context menu
  const storage = await chrome.storage.local.get("pendingAsset");
  pendingAsset = storage.pendingAsset || null;

  if (pendingAsset) {
    const canvasFolders = folders.filter((f) => f.type === "canvas");
    if (canvasFolders.length === 0) {
      showError("No canvas folders found. Create one in VAYO first.");
      return;
    }

    populateSelect(assetFolderSelect, canvasFolders, "lastCanvasFolder");

    if (pendingAsset.assetType === "video") {
      assetPreviewVideo.src = pendingAsset.url;
      assetPreviewVideo.classList.remove("hidden");
    } else {
      assetPreviewImg.src = pendingAsset.url;
      assetPreviewImg.classList.remove("hidden");
    }

    showScreen(screenAsset);
  } else {
    const bookmarkFolders = folders.filter((f) => f.type === "bookmarks");
    if (bookmarkFolders.length === 0) {
      showError("No bookmark folders found. Create one in VAYO first.");
      return;
    }

    populateSelect(bookmarkFolderSelect, bookmarkFolders, "lastBookmarkFolder");

    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      bookmarkTitle.textContent = tab.title || "Untitled";
      bookmarkUrl.textContent = tab.url || "";
      if (tab.favIconUrl) {
        bookmarkFavicon.src = tab.favIconUrl;
      } else {
        bookmarkFavicon.style.display = "none";
      }
    }

    showScreen(screenBookmark);
  }
}

// Event listeners
btnSignin.addEventListener("click", () => {
  chrome.tabs.create({ url: APP_URL });
  window.close();
});

btnSaveBookmark.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const folderId = bookmarkFolderSelect.value;
  btnSaveBookmark.disabled = true;
  btnSaveBookmark.textContent = "Saving...";

  try {
    await createBookmark(tab.url, folderId);
    chrome.storage.local.set({ lastBookmarkFolder: folderId });
    showScreen(screenSuccess);
    setTimeout(() => window.close(), 1500);
  } catch {
    btnSaveBookmark.disabled = false;
    btnSaveBookmark.textContent = "Save";
    showError("Failed to save bookmark.");
  }
});

btnSaveAsset.addEventListener("click", async () => {
  if (!pendingAsset) return;

  const folderId = assetFolderSelect.value;
  btnSaveAsset.disabled = true;
  btnSaveAsset.textContent = "Saving...";

  try {
    await createAsset(pendingAsset.url, folderId, pendingAsset.assetType);
    chrome.storage.local.remove("pendingAsset");
    chrome.storage.local.set({ lastCanvasFolder: folderId });
    showScreen(screenSuccess);
    setTimeout(() => window.close(), 1500);
  } catch {
    btnSaveAsset.disabled = false;
    btnSaveAsset.textContent = "Save";
    showError("Failed to save asset.");
  }
});

btnRetry.addEventListener("click", () => init());

init();
