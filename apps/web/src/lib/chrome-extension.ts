export const VAYO_CHROME_EXTENSION_ID = "jaloallboddnknljngplmccchmncogeb";
export const VAYO_CHROME_EXTENSION_STORE_URL =
  "https://chromewebstore.google.com/detail/vayo/jaloallboddnknljngplmccchmncogeb";

type PageRuntime = {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response?: { type?: string }) => void
  ) => void;
};

function getPageRuntime() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    (window as Window & { chrome?: { runtime?: PageRuntime } }).chrome?.runtime
      ?? null
  );
}

export function canRecommendChromeExtension() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(userAgent);
  const isChromiumBrowser = /Chrome|Chromium|Edg|OPR/i.test(userAgent);
  const isFirefoxBrowser = /Firefox|FxiOS/i.test(userAgent);

  return !isMobileDevice && isChromiumBrowser && !isFirefoxBrowser;
}

export async function checkVayoChromeExtensionInstalled() {
  if (!canRecommendChromeExtension()) {
    return false;
  }

  const runtime = getPageRuntime();
  if (!runtime?.sendMessage) {
    return false;
  }

  return await new Promise<boolean>((resolve) => {
    try {
      runtime.sendMessage(
        VAYO_CHROME_EXTENSION_ID,
        { type: "PING" },
        (response) => {
          if (runtime.lastError) {
            resolve(false);
            return;
          }

          resolve(response?.type === "PONG");
        }
      );
    } catch {
      resolve(false);
    }
  });
}
