import { APP_URL, SERVER_URL } from "./lib/config";
import { getSessionCookie } from "./lib/cookies";

type AssetType = "image" | "video";

type OverlayMode =
  | { kind: "bookmark"; pageUrl: string; pageTitle: string | null; favIconUrl: string | null }
  | {
      kind: "asset";
      url: string;
      assetType: AssetType;
      sourcePageUrl: string | null;
    }
  | {
      kind: "tweet-assets";
      sourcePageUrl: string | null;
      state:
        | { status: "loading" }
        | { status: "error"; message: string }
        | { status: "ready"; assets: { url: string; assetType: AssetType }[] };
    };

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

// Pages where chrome.scripting.executeScript is not allowed (chrome://, the
// Web Store, view-source:, etc). Fall back to opening the legacy windowed
// popup on these — at least the user can still save.
function canInjectInto(url: string | undefined): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url) || /^file:\/\//i.test(url);
}

async function ensureOverlayInjected(tabId: number): Promise<boolean> {
  // Probe first — if the overlay is already mounted on this tab, just message
  // it directly. If not, the probe rejects and we inject.
  try {
    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "VAYO_OVERLAY_PING",
    });
    if (pong?.type === "VAYO_OVERLAY_PONG") return true;
  } catch {
    // not injected yet
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/overlay/overlay.js"],
    });
    return true;
  } catch {
    return false;
  }
}

async function showOverlay(tabId: number, mode: OverlayMode) {
  const ok = await ensureOverlayInjected(tabId);
  if (!ok) return; // restricted page (chrome://, web store, strict CSP) — silently skip
  await chrome.tabs.sendMessage(tabId, { type: "VAYO_OVERLAY_SHOW", mode });
}

async function updateOverlay(tabId: number, mode: OverlayMode) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "VAYO_OVERLAY_UPDATE", mode });
  } catch {
    // overlay was dismissed before update arrived — fine
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

async function sendToTweetExtractor(tabId: number, message: unknown) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content/x-tweet.js"],
    });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

async function authedHeaders(
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const cookie = await getSessionCookie();
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

async function trpcQuery<T = unknown>(
  path: string,
  input?: unknown
): Promise<T> {
  const url = new URL(`${SERVER_URL}/trpc/${path}`);
  if (input !== undefined) {
    url.searchParams.set("input", JSON.stringify(input));
  }
  const res = await fetch(url.toString(), { headers: await authedHeaders() });
  if (!res.ok) throw new Error(`trpc query failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

async function trpcMutation<T = unknown>(
  path: string,
  input: unknown
): Promise<T> {
  const res = await fetch(`${SERVER_URL}/trpc/${path}`, {
    method: "POST",
    headers: await authedHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`trpc mutation failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

async function bgGetSession() {
  const cookie = await getSessionCookie();
  if (!cookie) return null;
  const res = await fetch(`${SERVER_URL}/auth/get-session`, {
    headers: { Cookie: cookie },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user ? data : null;
}

async function bgCreateAsset(
  url: string,
  folderId: string,
  assetType: AssetType
) {
  return trpcMutation("items.createAsset", { url, folderId, assetType });
}

async function downloadAndUploadAsset(
  sourceUrl: string,
  folderId: string,
  assetType: AssetType
) {
  const mediaRes = await fetch(sourceUrl);
  if (!mediaRes.ok)
    throw new Error(`Failed to download media: ${mediaRes.status}`);
  const blob = await mediaRes.blob();

  const contentType =
    blob.type || (assetType === "video" ? "video/mp4" : "image/jpeg");
  const ext =
    contentType.split("/")[1]?.split(";")[0] ||
    (assetType === "video" ? "mp4" : "jpg");
  const fileName = `tweet-asset.${ext}`;

  const uploadUrlRes = await fetch(`${SERVER_URL}/upload-url`, {
    method: "POST",
    headers: await authedHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ folderId, fileName, contentType }),
  });
  if (!uploadUrlRes.ok)
    throw new Error(`Failed to get upload URL: ${uploadUrlRes.status}`);
  const { signedUrl, publicUrl } = await uploadUrlRes.json();

  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error(`Failed to upload: ${uploadRes.status}`);

  return bgCreateAsset(publicUrl, folderId, assetType);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Tweet-asset save (also used by popup)
  if (message?.type === "SAVE_ASSET") {
    const handler = message.reupload
      ? downloadAndUploadAsset(message.url, message.folderId, message.assetType)
      : bgCreateAsset(message.url, message.folderId, message.assetType);

    handler
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // API proxy for the content-script overlay (no chrome.cookies access there)
  if (message?.type === "VAYO_API") {
    (async () => {
      try {
        switch (message.action) {
          case "getSession": {
            const data = await bgGetSession();
            sendResponse({ success: true, data });
            return;
          }
          case "getFolders": {
            const data = await trpcQuery("folders.getFolders");
            sendResponse({ success: true, data });
            return;
          }
          case "createBookmark": {
            const data = await trpcMutation("items.createLink", {
              url: message.url,
              folderId: message.folderId,
            });
            sendResponse({ success: true, data });
            return;
          }
          case "createAsset": {
            const data = await bgCreateAsset(
              message.url,
              message.folderId,
              message.assetType
            );
            sendResponse({ success: true, data });
            return;
          }
          default:
            sendResponse({ success: false, error: "unknown action" });
        }
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return true;
  }
});

chrome.runtime.onMessageExternal.addListener(
  (message, _sender, sendResponse) => {
    if (message?.type === "PING") {
      sendResponse({ type: "PONG" });
    }
  }
);

chrome.action.onClicked.addListener((tab) => {
  if (tab?.id == null) return;
  if (!canInjectInto(tab.url)) {
    // On restricted pages (chrome://, web store, etc.) we can't inject the
    // overlay — open the app instead so the click still does something.
    void chrome.tabs.create({ url: APP_URL });
    return;
  }
  void showOverlay(tab.id, {
    kind: "bookmark",
    pageUrl: tab.url ?? "",
    pageTitle: tab.title ?? null,
    favIconUrl: tab.favIconUrl ?? null,
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-vayo" && info.srcUrl && tab?.id != null) {
    if (!canInjectInto(tab.url)) return; // silently skip on chrome:// pages
    const assetType: AssetType =
      info.mediaType === "video" ? "video" : "image";
    void showOverlay(tab.id, {
      kind: "asset",
      url: info.srcUrl,
      assetType,
      sourcePageUrl: info.pageUrl ?? tab.url ?? null,
    });
    return;
  }

  if (info.menuItemId === "save-tweet-assets" && tab?.id != null) {
    const tabId = tab.id;
    const sourcePageUrl = info.pageUrl ?? tab.url ?? null;

    // Show overlay in loading state immediately, then update when extraction
    // completes.
    void showOverlay(tabId, {
      kind: "tweet-assets",
      sourcePageUrl,
      state: { status: "loading" },
    });

    void (async () => {
      try {
        const response = await sendToTweetExtractor(tabId, {
          type: "EXTRACT_TWEET_ASSETS",
        });

        if (response?.error) {
          await updateOverlay(tabId, {
            kind: "tweet-assets",
            sourcePageUrl,
            state: { status: "error", message: response.error },
          });
          return;
        }

        if (response?.assets !== undefined) {
          const assets: { url: string; assetType: AssetType }[] = [
            ...response.assets,
          ];

          if (response.tweetId) {
            const videoUrls = await fetchVideoUrls(response.tweetId);
            for (const url of videoUrls) {
              assets.push({ url, assetType: "video" });
            }
          }

          if (assets.length === 0) {
            await updateOverlay(tabId, {
              kind: "tweet-assets",
              sourcePageUrl,
              state: { status: "error", message: "No media found in this tweet." },
            });
          } else {
            await updateOverlay(tabId, {
              kind: "tweet-assets",
              sourcePageUrl,
              state: { status: "ready", assets },
            });
          }
          return;
        }

        await updateOverlay(tabId, {
          kind: "tweet-assets",
          sourcePageUrl,
          state: { status: "error", message: "No response from content script." },
        });
      } catch {
        await updateOverlay(tabId, {
          kind: "tweet-assets",
          sourcePageUrl,
          state: {
            status: "error",
            message: "Could not connect to page. Try refreshing the page.",
          },
        });
      }
    })();
  }
});
