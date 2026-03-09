let lastTarget: HTMLElement | null = null;

document.addEventListener("contextmenu", (e) => {
  lastTarget = e.target as HTMLElement;
});

// Also capture on mousedown (right-click) — fires before contextmenu
document.addEventListener("mousedown", (e) => {
  if (e.button === 2) {
    lastTarget = e.target as HTMLElement;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_TWEET_ASSETS") {
    sendResponse(extractTweetAssets());
  }
});

type AssetResult =
  | { error: string }
  | { assets: { url: string; assetType: "image" | "video" }[]; tweetId: string | null };

function findTweetArticle(): HTMLElement | null {
  // Try from the right-click target first
  if (lastTarget) {
    const article = lastTarget.closest('article[data-testid="tweet"]');
    if (article) return article as HTMLElement;
  }

  // Fallback: find the tweet article from hovered elements (context menu still shows hover state)
  const hovered = document.querySelectorAll('article[data-testid="tweet"]:hover');
  if (hovered.length > 0) return hovered[hovered.length - 1] as HTMLElement;

  return null;
}

function extractTweetAssets(): AssetResult {
  const article = findTweetArticle();
  if (!article) {
    return { error: "Right-click on a tweet to save its media." };
  }

  const assets: { url: string; assetType: "image" | "video" }[] = [];

  // Extract images
  const imgElements = article.querySelectorAll(
    'div[data-testid="tweetPhoto"] img'
  );
  for (const img of imgElements) {
    const src = (img as HTMLImageElement).src;
    if (src && src.includes("pbs.twimg.com/media")) {
      assets.push({ url: upgradeImageUrl(src), assetType: "image" });
    }
  }

  // Always extract tweet ID so background can check for videos via syndication API
  const tweetId = extractTweetId(article);

  return { assets, tweetId };
}

function upgradeImageUrl(src: string): string {
  const url = new URL(src);
  url.searchParams.set("name", "orig");
  return url.toString();
}

function extractTweetId(article: HTMLElement): string | null {
  const links = article.querySelectorAll('a[href*="/status/"]');
  for (const link of links) {
    if (link.querySelector("time")) {
      const href = (link as HTMLAnchorElement).href;
      const match = href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
  }
  return null;
}
