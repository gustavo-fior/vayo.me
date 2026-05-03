import { APP_URL } from "../lib/config";
import { overlayCss } from "./overlay.css";

type AssetType = "image" | "video";

interface Folder {
  id: string;
  name: string;
  icon: string | null;
}

type OverlayMode =
  | {
      kind: "bookmark";
      pageUrl: string;
      pageTitle: string | null;
      favIconUrl: string | null;
    }
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

const HOST_ID = "vayo-overlay-root";
const LAST_FOLDER_KEY = "lastFolder";

let host: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let shellEl: HTMLDivElement | null = null;
let foldersCache: Folder[] | null = null;
let isMounted = false;

// Avoid double-init if the script is injected twice
const w = window as unknown as { __vayoOverlayLoaded?: boolean };
if (w.__vayoOverlayLoaded) {
  // already wired up
} else {
  w.__vayoOverlayLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "VAYO_OVERLAY_PING") {
      sendResponse({ type: "VAYO_OVERLAY_PONG" });
      return;
    }
    if (message?.type === "VAYO_OVERLAY_SHOW") {
      void render(message.mode as OverlayMode, true);
      return;
    }
    if (message?.type === "VAYO_OVERLAY_UPDATE") {
      void render(message.mode as OverlayMode, false);
      return;
    }
  });
}

function onDocPointerDown(event: PointerEvent) {
  if (!host) return;
  // Clicks inside the shadow root retarget to the host element at the
  // document level, so a containment check on the host is sufficient.
  if (host.contains(event.target as Node)) return;
  unmount();
}

function onDocKeyDown(event: KeyboardEvent) {
  if (event.key === "Escape" && host) {
    event.stopPropagation();
    unmount();
  }
}

function ensureMounted() {
  if (isMounted && host && shadow && shellEl) return;

  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();

  host = document.createElement("div");
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = overlayCss;
  shadow.appendChild(style);

  shellEl = document.createElement("div");
  shellEl.className = "shell";
  shadow.appendChild(shellEl);

  document.documentElement.appendChild(host);
  isMounted = true;

  // Capture-phase listeners so pages that stopPropagation can't trap us.
  document.addEventListener("pointerdown", onDocPointerDown, true);
  document.addEventListener("keydown", onDocKeyDown, true);
}

function unmount() {
  if (!host) {
    isMounted = false;
    return;
  }
  document.removeEventListener("pointerdown", onDocPointerDown, true);
  document.removeEventListener("keydown", onDocKeyDown, true);
  shellEl?.classList.add("closing");
  const node = host;
  setTimeout(() => {
    node.remove();
  }, 140);
  host = null;
  shadow = null;
  shellEl = null;
  isMounted = false;
}

async function api<T = unknown>(
  payload: Record<string, unknown>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const res = await chrome.runtime.sendMessage({ type: "VAYO_API", ...payload });
    return res ?? { success: false, error: "no response" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: {
    className?: string;
    text?: string;
    attrs?: Record<string, string>;
    children?: (Node | string)[];
  }
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options?.className) node.className = options.className;
  if (options?.text != null) node.textContent = options.text;
  if (options?.attrs) {
    for (const [k, v] of Object.entries(options.attrs)) node.setAttribute(k, v);
  }
  if (options?.children) {
    for (const child of options.children) {
      node.append(typeof child === "string" ? document.createTextNode(child) : child);
    }
  }
  return node;
}

function clearShell() {
  if (!shellEl) return;
  shellEl.innerHTML = "";
  shellEl.classList.remove("closing");
}

function makeCloseButton() {
  const btn = el("button", {
    className: "close-btn",
    text: "×",
    attrs: { type: "button", "aria-label": "Close" },
  });
  btn.addEventListener("click", () => unmount());
  return btn;
}

function showLoading() {
  if (!shellEl) return;
  clearShell();
  const spinner = el("div", { className: "spinner" });
  shellEl.appendChild(spinner);
}

function showAuth() {
  if (!shellEl) return;
  clearShell();
  const wrapper = el("div", { className: "auth" });
  wrapper.appendChild(el("h2", { text: "VAYØ" }));
  wrapper.appendChild(
    el("p", {
      className: "text-muted",
      text: "Sign in to save bookmarks and assets.",
    })
  );
  const btn = el("button", { className: "btn-primary", text: "Sign in to VAYØ" });
  btn.addEventListener("click", () => {
    window.open(APP_URL, "_blank");
    unmount();
  });
  wrapper.appendChild(btn);
  shellEl.appendChild(wrapper);
}

function showError(message: string) {
  if (!shellEl) return;
  clearShell();
  const wrapper = el("div", { className: "error" });
  wrapper.appendChild(el("p", { className: "text-destructive", text: message }));
  const close = el("button", { className: "btn-secondary", text: "Close" });
  close.addEventListener("click", () => unmount());
  wrapper.appendChild(close);
  shellEl.appendChild(wrapper);
}

function animateShellHeight(
  startHeight: number,
  opts?: { fadeContent?: boolean }
) {
  if (!shellEl || !startHeight) return;
  const target = shellEl;
  const endHeight = target.offsetHeight;
  if (!endHeight || startHeight === endHeight) return;
  target.style.height = `${startHeight}px`;
  target.style.overflow = "hidden";
  target.style.transition = "height 280ms ease";
  if (opts?.fadeContent) target.classList.add("shell-content-in");
  requestAnimationFrame(() => {
    target.style.height = `${endHeight}px`;
  });
  const cleanup = (event: TransitionEvent) => {
    if (event.propertyName !== "height") return;
    target.style.transition = "";
    target.style.height = "";
    target.style.overflow = "";
    target.classList.remove("shell-content-in");
    target.removeEventListener("transitionend", cleanup);
  };
  target.addEventListener("transitionend", cleanup);
}

function showSuccess() {
  if (!shellEl) return;
  const startHeight = shellEl.offsetHeight;
  clearShell();
  const wrapper = el("div", { className: "success" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "checkmark");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const polyline = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline"
  );
  polyline.setAttribute("points", "4 12 9 17 20 6");
  svg.appendChild(polyline);
  wrapper.appendChild(svg);
  wrapper.appendChild(el("p", { className: "success-text", text: "Saved!" }));
  shellEl.appendChild(wrapper);
  animateShellHeight(startHeight);

  setTimeout(() => unmount(), 1200);
}

type FolderSelect = HTMLDivElement & { value: string };

function makeFolderSelect(folders: Folder[]): FolderSelect {
  const wrapper = document.createElement("div") as FolderSelect;
  wrapper.className = "folder-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "folder-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerLabel = document.createElement("span");
  triggerLabel.className = "folder-select-label";
  trigger.appendChild(triggerLabel);

  const chevron = document.createElement("span");
  chevron.className = "folder-select-chevron";
  chevron.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  trigger.appendChild(chevron);

  wrapper.appendChild(trigger);

  const dropdown = document.createElement("div");
  dropdown.className = "folder-select-dropdown";
  dropdown.setAttribute("role", "listbox");
  wrapper.appendChild(dropdown);

  let currentValue = folders[0]?.id ?? "";
  let isOpen = false;
  let abortController: AbortController | null = null;

  function renderLabel(target: HTMLElement, folder: Folder | undefined) {
    target.replaceChildren();
    if (!folder) return;
    if (folder.icon) {
      const icon = document.createElement("span");
      icon.className = "folder-select-icon";
      icon.textContent = folder.icon;
      target.appendChild(icon);
    }
    const name = document.createElement("span");
    name.className = "folder-select-name";
    name.textContent = folder.name;
    target.appendChild(name);
  }

  function syncSelection() {
    const folder = folders.find((f) => f.id === currentValue);
    renderLabel(triggerLabel, folder);
    for (const child of dropdown.children) {
      const item = child as HTMLElement;
      const selected = item.dataset.value === currentValue;
      item.setAttribute("aria-selected", selected ? "true" : "false");
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    trigger.setAttribute("aria-expanded", "true");
    dropdown.classList.add("open");
    abortController = new AbortController();
    // Listen inside the shadow root — composedPath() doesn't reveal nodes
    // inside a closed shadow when called from a document-level listener, so
    // the outside-click check has to happen from within the shadow tree.
    const root = wrapper.getRootNode();
    const listenTarget: EventTarget =
      root instanceof ShadowRoot ? root : document;
    listenTarget.addEventListener("pointerdown", onOutsideClick, {
      capture: true,
      signal: abortController.signal,
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    trigger.setAttribute("aria-expanded", "false");
    dropdown.classList.remove("open");
    abortController?.abort();
    abortController = null;
  }

  function onOutsideClick(event: Event) {
    const target = event.target as Node | null;
    if (!target || !wrapper.contains(target)) close();
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isOpen) close();
    else open();
  });

  for (const f of folders) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "folder-select-item";
    item.setAttribute("role", "option");
    item.dataset.value = f.id;
    const label = document.createElement("span");
    label.className = "folder-select-label";
    item.appendChild(label);
    renderLabel(label, f);
    item.addEventListener("click", (event) => {
      event.stopPropagation();
      currentValue = f.id;
      syncSelection();
      close();
    });
    dropdown.appendChild(item);
  }

  Object.defineProperty(wrapper, "value", {
    get() {
      return currentValue;
    },
    set(v: string) {
      currentValue = v;
      syncSelection();
    },
    configurable: true,
  });

  syncSelection();
  return wrapper;
}

function getLastFolder(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(LAST_FOLDER_KEY, (data) => {
      const v = data?.[LAST_FOLDER_KEY];
      resolve(typeof v === "string" ? v : null);
    });
  });
}

async function showBookmarkScreen(mode: Extract<OverlayMode, { kind: "bookmark" }>) {
  if (!shellEl) return;
  const startHeight = shellEl.offsetHeight;
  clearShell();

  if (!foldersCache) {
    showLoading();
    const res = await api<Folder[]>({ action: "getFolders" });
    if (!res.success) {
      showError("Failed to load folders.");
      return;
    }
    foldersCache = res.data;
    if (!shellEl) return;
    clearShell();
  }

  if (foldersCache.length === 0) {
    showError("No folders found. Create one in VAYØ first.");
    return;
  }

  // Page info
  const pageInfo = el("div", { className: "page-info" });
  if (mode.favIconUrl) {
    const img = el("img", {
      className: "favicon",
      attrs: { src: mode.favIconUrl, alt: "" },
    });
    pageInfo.appendChild(img);
  }
  const meta = el("div", { className: "page-meta" });
  meta.appendChild(
    el("div", {
      className: "page-title",
      text: mode.pageTitle || "Untitled",
    })
  );
  meta.appendChild(el("div", { className: "page-url", text: mode.pageUrl }));
  pageInfo.appendChild(meta);
  shellEl.appendChild(pageInfo);

  const field = el("div", { className: "field" });
  const select = makeFolderSelect(foldersCache);
  select.id = "vayo-folder";
  field.appendChild(select);
  shellEl.appendChild(field);

  const lastFolder = await getLastFolder();
  if (lastFolder && foldersCache.some((f) => f.id === lastFolder)) {
    select.value = lastFolder;
  }

  const saveBtn = el("button", { className: "btn-primary", text: "Save" });
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    const folderId = select.value;
    const res = await api({
      action: "createBookmark",
      url: mode.pageUrl,
      folderId,
    });
    if (!res.success) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      showError("Failed to save bookmark.");
      return;
    }
    void chrome.storage.local.set({ [LAST_FOLDER_KEY]: folderId });
    showSuccess();
  });
  shellEl.appendChild(saveBtn);
  animateShellHeight(startHeight, { fadeContent: true });
}

async function showAssetScreen(mode: Extract<OverlayMode, { kind: "asset" }>) {
  if (!shellEl) return;
  const startHeight = shellEl.offsetHeight;
  clearShell();

  if (!foldersCache) {
    showLoading();
    const res = await api<Folder[]>({ action: "getFolders" });
    if (!res.success) {
      showError("Failed to load folders.");
      return;
    }
    foldersCache = res.data;
    if (!shellEl) return;
    clearShell();
  }

  if (foldersCache.length === 0) {
    showError("No folders found. Create one in VAYØ first.");
    return;
  }

  // Preview
  const preview = el("div", { className: "asset-preview" });
  preview.appendChild(makeCloseButton());
  if (mode.assetType === "video") {
    const video = el("video", {
      attrs: { src: mode.url, autoplay: "", loop: "", muted: "", playsinline: "" },
    });
    video.muted = true;
    preview.appendChild(video);
  } else {
    preview.appendChild(
      el("img", { attrs: { src: mode.url, alt: "Preview" } })
    );
  }
  shellEl.appendChild(preview);

  const field = el("div", { className: "field" });
  const select = makeFolderSelect(foldersCache);
  select.id = "vayo-folder";
  field.appendChild(select);
  shellEl.appendChild(field);

  const lastFolder = await getLastFolder();
  if (lastFolder && foldersCache.some((f) => f.id === lastFolder)) {
    select.value = lastFolder;
  }

  const saveBtn = el("button", { className: "btn-primary", text: "Save" });
  saveBtn.addEventListener("click", async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    const folderId = select.value;
    const res = await api({
      action: "createAsset",
      url: mode.url,
      folderId,
      assetType: mode.assetType,
    });
    if (!res.success) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      showError("Failed to save asset.");
      return;
    }
    void chrome.storage.local.set({ [LAST_FOLDER_KEY]: folderId });
    showSuccess();
  });
  shellEl.appendChild(saveBtn);
  animateShellHeight(startHeight, { fadeContent: true });
}

async function showTweetAssetsScreen(
  mode: Extract<OverlayMode, { kind: "tweet-assets" }>
) {
  if (!shellEl) return;

  if (mode.state.status === "loading") {
    showLoading();
    return;
  }
  if (mode.state.status === "error") {
    showError(mode.state.message);
    return;
  }

  const startHeight = shellEl.offsetHeight;
  clearShell();

  if (!foldersCache) {
    showLoading();
    const res = await api<Folder[]>({ action: "getFolders" });
    if (!res.success) {
      showError("Failed to load folders.");
      return;
    }
    foldersCache = res.data;
    if (!shellEl) return;
    clearShell();
  }

  if (foldersCache.length === 0) {
    showError("No folders found. Create one in VAYØ first.");
    return;
  }

  let assets = mode.state.assets.slice();

  const grid = el("div", { className: "tweet-assets-grid" });
  shellEl.appendChild(grid);

  function renderGrid() {
    grid.innerHTML = "";
    assets.forEach((asset, index) => {
      const wrapper = el("div", { className: "asset-thumb-wrapper" });
      const remove = el("button", {
        className: "asset-thumb-remove",
        text: "×",
        attrs: { type: "button", "aria-label": "Remove asset" },
      });
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        assets = assets.filter((_, i) => i !== index);
        if (assets.length === 0) {
          unmount();
          return;
        }
        renderGrid();
      });
      wrapper.appendChild(remove);

      if (asset.assetType === "video") {
        const video = el("video", {
          className: "asset-thumb",
          attrs: { src: asset.url, muted: "", preload: "metadata" },
        });
        video.muted = true;
        wrapper.appendChild(video);
        wrapper.appendChild(
          el("span", { className: "video-badge", text: "▶" })
        );
      } else {
        wrapper.appendChild(
          el("img", { className: "asset-thumb", attrs: { src: asset.url } })
        );
      }
      grid.appendChild(wrapper);
    });
  }
  renderGrid();

  const field = el("div", { className: "field" });
  const select = makeFolderSelect(foldersCache);
  select.id = "vayo-folder";
  field.appendChild(select);
  shellEl.appendChild(field);

  const lastFolder = await getLastFolder();
  if (lastFolder && foldersCache.some((f) => f.id === lastFolder)) {
    select.value = lastFolder;
  }

  const saveBtn = el("button", { className: "btn-primary", text: "Save All" });
  shellEl.appendChild(saveBtn);

  saveBtn.addEventListener("click", async () => {
    if (assets.length === 0) return;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const folderId = select.value;
    const total = assets.length;

    try {
      let cursor = 0;
      const worker = async () => {
        while (cursor < total) {
          const i = cursor++;
          const result = await chrome.runtime.sendMessage({
            type: "SAVE_ASSET",
            url: assets[i].url,
            folderId,
            assetType: assets[i].assetType,
            reupload: true,
          });
          if (!result?.success) throw new Error(result?.error ?? "save failed");
        }
      };

      const concurrency = Math.min(4, total);
      await Promise.all(Array.from({ length: concurrency }, worker));
      void chrome.storage.local.set({ [LAST_FOLDER_KEY]: folderId });
      showSuccess();
    } catch {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save All";
      showError("Failed to save assets.");
    }
  });
  animateShellHeight(startHeight, { fadeContent: true });
}

async function render(mode: OverlayMode, isInitial: boolean) {
  ensureMounted();
  if (isInitial) {
    showLoading();
    const session = await api<{ user: unknown } | null>({ action: "getSession" });
    if (!session.success) {
      showError("Could not check sign-in status.");
      return;
    }
    if (!session.data) {
      showAuth();
      return;
    }
  }

  switch (mode.kind) {
    case "bookmark":
      await showBookmarkScreen(mode);
      return;
    case "asset":
      await showAssetScreen(mode);
      return;
    case "tweet-assets":
      await showTweetAssetsScreen(mode);
      return;
  }
}
