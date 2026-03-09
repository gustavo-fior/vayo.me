chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-vayo",
    title: "Add to VAYØ",
    contexts: ["image", "video"],
  });

  chrome.contextMenus.create({
    id: "save-tweet-assets",
    title: "Save assets to VAYØ",
    contexts: ["all"],
    documentUrlPatterns: ["https://x.com/*", "https://twitter.com/*"],
  });
});

async function openPopup() {
  try {
    await chrome.action.openPopup();
  } catch {
    const currentWindow = await chrome.windows.getCurrent();
    const left =
      (currentWindow.left ?? 0) + (currentWindow.width ?? 1200) - 420;
    const top = currentWindow.top ?? 40;
    chrome.windows.create({
      url: chrome.runtime.getURL("src/popup/popup.html"),
      type: "popup",
      width: 400,
      height: 420,
      left,
      top: top + 40,
    });
  }
}

async function fetchVideoUrls(tweetId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=0`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const urls: string[] = [];

    const mediaDetails = data.mediaDetails || [];
    for (const media of mediaDetails) {
      if (!media.video_info?.variants) continue;

      const mp4Variants = media.video_info.variants
        .filter((v: { content_type: string }) => v.content_type === "video/mp4")
        .sort(
          (a: { bitrate?: number }, b: { bitrate?: number }) =>
            (b.bitrate ?? 0) - (a.bitrate ?? 0)
        );

      if (mp4Variants.length > 0) {
        urls.push(mp4Variants[0].url);
      }
    }

    return urls;
  } catch {
    return [];
  }
}

async function sendToContentScript(tabId: number, message: unknown) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not yet injected — inject it and retry
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content/x-tweet.js"],
    });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

import { SERVER_URL } from "./lib/config";

async function bgCreateAsset(
  url: string,
  folderId: string,
  assetType: "image" | "video"
) {
  const res = await fetch(`${SERVER_URL}/trpc/canvasAssets.createAsset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, folderId, assetType }),
  });
  if (!res.ok) throw new Error(`createAsset failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

async function downloadAndUploadAsset(
  sourceUrl: string,
  folderId: string,
  assetType: "image" | "video"
) {
  // Download the media blob
  const mediaRes = await fetch(sourceUrl);
  if (!mediaRes.ok) throw new Error(`Failed to download media: ${mediaRes.status}`);
  const blob = await mediaRes.blob();

  const contentType = blob.type || (assetType === "video" ? "video/mp4" : "image/jpeg");
  const ext = contentType.split("/")[1]?.split(";")[0] || (assetType === "video" ? "mp4" : "jpg");
  const fileName = `tweet-asset.${ext}`;

  // Get a signed upload URL from the server
  const uploadUrlRes = await fetch(`${SERVER_URL}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ folderId, fileName, contentType }),
  });
  if (!uploadUrlRes.ok) throw new Error(`Failed to get upload URL: ${uploadUrlRes.status}`);
  const { signedUrl, publicUrl } = await uploadUrlRes.json();

  // Upload the blob to Supabase
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error(`Failed to upload: ${uploadRes.status}`);

  // Save the asset with the Supabase public URL
  return bgCreateAsset(publicUrl, folderId, assetType);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SAVE_ASSET") {
    const handler = message.reupload
      ? downloadAndUploadAsset(message.url, message.folderId, message.assetType)
      : bgCreateAsset(message.url, message.folderId, message.assetType);

    handler
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-vayo" && info.srcUrl) {
    const assetType = info.mediaType === "video" ? "video" : "image";
    await chrome.storage.local.remove("pendingTweetAssets");
    await chrome.storage.local.set({
      pendingAsset: { url: info.srcUrl, assetType },
    });
    await openPopup();
    return;
  }

  if (info.menuItemId === "save-tweet-assets" && tab?.id) {
    await chrome.storage.local.remove("pendingAsset");
    try {
      const response = await sendToContentScript(tab.id, {
        type: "EXTRACT_TWEET_ASSETS",
      });

      if (response?.error) {
        await chrome.storage.local.set({
          pendingTweetAssets: { error: response.error },
        });
      } else if (response?.assets !== undefined) {
        const assets: { url: string; assetType: "image" | "video" }[] = [
          ...response.assets,
        ];

        // Fetch video URLs from syndication API (needs background's host_permissions)
        if (response.tweetId) {
          const videoUrls = await fetchVideoUrls(response.tweetId);
          for (const url of videoUrls) {
            assets.push({ url, assetType: "video" });
          }
        }

        if (assets.length === 0) {
          await chrome.storage.local.set({
            pendingTweetAssets: { error: "No media found in this tweet." },
          });
        } else {
          await chrome.storage.local.set({
            pendingTweetAssets: { assets },
          });
        }
      } else {
        await chrome.storage.local.set({
          pendingTweetAssets: { error: "No response from content script." },
        });
      }
    } catch {
      await chrome.storage.local.set({
        pendingTweetAssets: {
          error: "Could not connect to page. Try refreshing the page.",
        },
      });
    }

    await openPopup();
  }
});
