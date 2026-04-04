import { getSession } from "../lib/auth";
import {
  getFolders,
  createBookmark,
  createAsset,
  type Folder,
} from "../lib/api";
import { APP_URL } from "../lib/config";

// Screens
const screenLoading = document.getElementById("screen-loading")!;
const screenAuth = document.getElementById("screen-auth")!;
const screenBookmark = document.getElementById("screen-bookmark")!;
const screenAsset = document.getElementById("screen-asset")!;
const screenTweetAssets = document.getElementById("screen-tweet-assets")!;
const screenSuccess = document.getElementById("screen-success")!;
const screenError = document.getElementById("screen-error")!;

// Debug: try all possible URL/domain combinations
// const debugUrls = [
//   "https://vayo.me",
//   "https://vayo.me/api",
//   "https://vayo.me/api/auth",
//   "https://www.vayo.me",
//   "http://localhost:3001",
//   "http://localhost:3001/api",
//   "http://localhost:3001/api/auth",
//   "localhost:3001/api/auth/session",
// ];
// for (const url of debugUrls) {
//   const c = await chrome.cookies.getAll({ url });
//   console.log(
//     `cookies for ${url}:`,
//     c.map((x) => x.name)
//   );
// }

// // Also try by domain directly
// const byProdDomain = await chrome.cookies.getAll({ domain: "vayo.me" });
// console.log(
//   "cookies by domain vayo.me:",
//   byProdDomain.map((x) => `${x.name} (path=${x.path}, domain=${x.domain})`)
// );

// const byDevDomain = await chrome.cookies.getAll({ domain: "localhost:3001" });
// console.log(
//   "cookies by domain localhost:3001:",
//   byDevDomain.map((x) => `${x.name} (path=${x.path}, domain=${x.domain})`)
// );

// // Also try all cookies (no filter)
// const everything = await chrome.cookies.getAll({});
// const sessionOnes = everything.filter((c) => c.name.includes("session"));
// console.log(
//   "all session cookies across all domains:",
//   sessionOnes.map((x) => `${x.name} @ ${x.domain} (path=${x.path})`)
// );

// Elements
const btnSignin = document.getElementById("btn-signin") as HTMLButtonElement;
const btnSaveBookmark = document.getElementById(
  "btn-save-bookmark"
) as HTMLButtonElement;
const btnSaveAsset = document.getElementById(
  "btn-save-asset"
) as HTMLButtonElement;
const btnRemoveAsset = document.getElementById(
  "btn-remove-asset"
) as HTMLButtonElement;
const btnSaveTweetAssets = document.getElementById(
  "btn-save-tweet-assets"
) as HTMLButtonElement;
const btnRetry = document.getElementById("btn-retry") as HTMLButtonElement;
const bookmarkFavicon = document.getElementById(
  "bookmark-favicon"
) as HTMLImageElement;
const bookmarkTitle = document.getElementById("bookmark-title")!;
const bookmarkUrl = document.getElementById("bookmark-url")!;
const bookmarkFolderSelect = document.getElementById(
  "bookmark-folder"
) as HTMLSelectElement;
const assetPreviewImg = document.getElementById(
  "asset-preview-img"
) as HTMLImageElement;
const assetPreviewVideo = document.getElementById(
  "asset-preview-video"
) as HTMLVideoElement;
const assetFolderSelect = document.getElementById(
  "asset-folder"
) as HTMLSelectElement;
const tweetAssetsCount = document.getElementById("tweet-assets-count")!;
const tweetAssetsGrid = document.getElementById("tweet-assets-grid")!;
const tweetAssetsFolderSelect = document.getElementById(
  "tweet-assets-folder"
) as HTMLSelectElement;
const tweetAssetsProgressBar = document.getElementById(
  "tweet-assets-progress-bar"
)!;
const tweetAssetsProgressFill = document.getElementById(
  "tweet-assets-progress-fill"
)!;
const tweetAssetsProgressText = document.getElementById(
  "tweet-assets-progress-text"
)!;
const errorMessage = document.getElementById("error-message")!;

type PendingAsset = {
  url: string;
  assetType: "image" | "video";
  sourcePageUrl?: string | null;
};
type PendingTweetAssets =
  | { error: string; assets?: undefined; sourcePageUrl?: string | null }
  | { assets: PendingAsset[]; error?: undefined; sourcePageUrl?: string | null };
type PopupSourceContext = {
  url?: string | null;
  title?: string | null;
  favIconUrl?: string | null;
};

let pendingAsset: PendingAsset | null = null;
let pendingTweetAssetsData: PendingTweetAssets | null = null;
let currentPageContext: PopupSourceContext | null = null;

function showScreen(screen: HTMLElement) {
  [
    screenLoading,
    screenAuth,
    screenBookmark,
    screenAsset,
    screenTweetAssets,
    screenSuccess,
    screenError,
  ].forEach((s) => s.classList.add("hidden"));
  screen.classList.remove("hidden");
}

function showError(msg: string) {
  errorMessage.textContent = msg;
  showScreen(screenError);
}

function isExtensionPage(url: string | null | undefined) {
  return Boolean(url?.startsWith("chrome-extension://"));
}

function resetAssetPreview() {
  assetPreviewImg.src = "";
  assetPreviewImg.classList.add("hidden");
  assetPreviewVideo.pause();
  assetPreviewVideo.removeAttribute("src");
  assetPreviewVideo.load();
  assetPreviewVideo.classList.add("hidden");
}

function resetBookmarkPreview() {
  bookmarkTitle.textContent = "";
  bookmarkUrl.textContent = "";
  bookmarkFavicon.src = "";
  bookmarkFavicon.style.display = "";
}

function populateSelect(
  select: HTMLSelectElement,
  folders: Folder[],
  storageKey: string
) {
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

function renderTweetAssetsGrid(assets: PendingAsset[]) {
  tweetAssetsGrid.innerHTML = "";
  for (const [index, asset] of assets.entries()) {
    const wrapper = document.createElement("div");
    wrapper.className = "asset-thumb-wrapper";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "asset-thumb-remove";
    if (asset.assetType === "video") {
      removeButton.classList.add("asset-thumb-remove-video");
    }
    removeButton.setAttribute("aria-label", "Remove asset");
    removeButton.textContent = "\u00D7";
    removeButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await removeTweetAsset(index);
    });
    wrapper.appendChild(removeButton);

    if (asset.assetType === "video") {
      const video = document.createElement("video");
      video.src = asset.url;
      video.className = "asset-thumb";
      video.muted = true;
      video.preload = "metadata";
      wrapper.appendChild(video);

      const badge = document.createElement("span");
      badge.className = "video-badge";
      badge.textContent = "\u25B6";
      wrapper.appendChild(badge);
    } else {
      const img = document.createElement("img");
      img.src = asset.url;
      img.className = "asset-thumb";
      wrapper.appendChild(img);
    }

    tweetAssetsGrid.appendChild(wrapper);
  }
}

async function clearPopupContext() {
  await chrome.storage.local.remove("popupSourceContext");
}

async function removeSingleAsset() {
  pendingAsset = null;
  resetAssetPreview();
  await chrome.storage.local.remove("pendingAsset");
  await clearPopupContext();
  window.close();
}

async function removeTweetAsset(index: number) {
  const assets = pendingTweetAssetsData?.assets;
  if (!assets) return;

  const nextAssets = assets.filter((_, assetIndex) => assetIndex !== index);

  if (nextAssets.length === 0) {
    pendingTweetAssetsData = null;
    await chrome.storage.local.remove("pendingTweetAssets");
    await clearPopupContext();
    window.close();
    return;
  }

  pendingTweetAssetsData = {
    assets: nextAssets,
    sourcePageUrl: pendingTweetAssetsData?.sourcePageUrl ?? null,
  };

  await chrome.storage.local.set({
    pendingTweetAssets: pendingTweetAssetsData,
  });

  tweetAssetsCount.textContent = `${nextAssets.length} asset${
    nextAssets.length === 1 ? "" : "s"
  } found`;
  renderTweetAssetsGrid(nextAssets);
}

async function init() {
  showScreen(screenLoading);
  resetAssetPreview();
  resetBookmarkPreview();

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
  const storage = await chrome.storage.local.get([
    "pendingAsset",
    "pendingTweetAssets",
    "popupSourceContext",
  ]);
  pendingAsset = storage.pendingAsset || null;
  pendingTweetAssetsData = storage.pendingTweetAssets || null;
  const popupSourceContext = (storage.popupSourceContext ||
    null) as PopupSourceContext | null;
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const shouldUseSourceContext = isExtensionPage(activeTab?.url);

  currentPageContext = shouldUseSourceContext
    ? popupSourceContext
    : {
        url: activeTab?.url ?? null,
        title: activeTab?.title ?? null,
        favIconUrl: activeTab?.favIconUrl ?? null,
      };

  const currentPageUrl = currentPageContext?.url ?? null;

  if (!shouldUseSourceContext && popupSourceContext) {
    await chrome.storage.local.remove("popupSourceContext");
  }

  if (pendingTweetAssetsData) {
    if (pendingTweetAssetsData.error) {
      showError(pendingTweetAssetsData.error);
      chrome.storage.local.remove("pendingTweetAssets");
      return;
    }

    const assets = pendingTweetAssetsData.assets!;
    const canvasFolders = folders.filter((f) => f.type === "canvas");
    if (canvasFolders.length === 0) {
      showError("No canvas folders found. Create one in VAYØ first.");
      return;
    }

    tweetAssetsCount.textContent = `${assets.length} asset${
      assets.length === 1 ? "" : "s"
    } found`;
    populateSelect(tweetAssetsFolderSelect, canvasFolders, "lastCanvasFolder");
    renderTweetAssetsGrid(assets);
    showScreen(screenTweetAssets);
  } else if (pendingAsset) {
    const canvasFolders = folders.filter((f) => f.type === "canvas");
    if (canvasFolders.length === 0) {
      showError("No canvas folders found. Create one in VAYØ first.");
      return;
    }

    populateSelect(assetFolderSelect, canvasFolders, "lastCanvasFolder");
    btnRemoveAsset.classList.remove("asset-remove-btn-video");

    if (pendingAsset.assetType === "video") {
      btnRemoveAsset.classList.add("asset-remove-btn-video");
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
      showError("No bookmark folders found. Create one in VAYØ first.");
      return;
    }

    populateSelect(bookmarkFolderSelect, bookmarkFolders, "lastBookmarkFolder");

    if (currentPageContext?.url) {
      bookmarkTitle.textContent = currentPageContext.title || "Untitled";
      bookmarkUrl.textContent = currentPageContext.url || "";
      if (currentPageContext.favIconUrl) {
        bookmarkFavicon.src = currentPageContext.favIconUrl;
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
  if (!currentPageContext?.url) return;

  const folderId = bookmarkFolderSelect.value;
  btnSaveBookmark.disabled = true;
  btnSaveBookmark.textContent = "Saving...";

  try {
    await createBookmark(currentPageContext.url, folderId);
    chrome.storage.local.set({
      lastBookmarkFolder: folderId,
      popupSourceContext: null,
    });
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
    chrome.storage.local.set({
      lastCanvasFolder: folderId,
      popupSourceContext: null,
    });
    showScreen(screenSuccess);
    setTimeout(() => window.close(), 1500);
  } catch {
    btnSaveAsset.disabled = false;
    btnSaveAsset.textContent = "Save";
    showError("Failed to save asset.");
  }
});

btnRemoveAsset.addEventListener("click", async () => {
  await removeSingleAsset();
});

btnSaveTweetAssets.addEventListener("click", async () => {
  if (!pendingTweetAssetsData?.assets) return;

  const assets = pendingTweetAssetsData.assets;
  const folderId = tweetAssetsFolderSelect.value;
  btnSaveTweetAssets.disabled = true;
  btnSaveTweetAssets.textContent = "Saving...";

  tweetAssetsProgressBar.classList.remove("hidden");
  tweetAssetsProgressText.classList.remove("hidden");

  try {
    for (let i = 0; i < assets.length; i++) {
      tweetAssetsProgressText.textContent = `Saving ${i + 1} of ${
        assets.length
      }...`;
      tweetAssetsProgressFill.style.width = `${
        ((i + 1) / assets.length) * 100
      }%`;

      // Save via background script — downloads from Twitter and reuploads to storage
      const result = await chrome.runtime.sendMessage({
        type: "SAVE_ASSET",
        url: assets[i].url,
        folderId,
        assetType: assets[i].assetType,
        reupload: true,
      });
      if (!result.success) throw new Error(result.error);
    }

    chrome.storage.local.remove("pendingTweetAssets");
    chrome.storage.local.set({
      lastCanvasFolder: folderId,
      popupSourceContext: null,
    });
    showScreen(screenSuccess);
    setTimeout(() => window.close(), 1500);
  } catch {
    btnSaveTweetAssets.disabled = false;
    btnSaveTweetAssets.textContent = "Save All";
    tweetAssetsProgressBar.classList.add("hidden");
    tweetAssetsProgressText.classList.add("hidden");
    showError("Failed to save assets.");
  }
});

btnRetry.addEventListener("click", () => init());

init();
