chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-vayo",
    title: "Add to VAYØ",
    contexts: ["image", "video"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "add-to-vayo" || !info.srcUrl) return;

  const assetType = info.mediaType === "video" ? "video" : "image";

  await chrome.storage.local.set({
    pendingAsset: { url: info.srcUrl, assetType },
  });

  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup() requires Chrome 127+, fallback to window
    // Get current window to position the popup at its top-right
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
});
