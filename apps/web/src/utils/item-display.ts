import type { ItemRecord } from "@/types/items";

export function getItemDomain(url: string | null) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export function getItemSubtitle(item: ItemRecord) {
  if (item.type === "color") {
    return item.color;
  }

  if (item.type === "image" || item.type === "video") {
    return item.originalFilename || item.mimeType || getItemDomain(item.url);
  }

  return item.description || getItemDomain(item.url);
}

export function getCanvasNodeSize(item: ItemRecord) {
  if (item.type === "link") {
    return { width: 320, height: 140 };
  }

  if (item.type === "color") {
    return { width: 220, height: 160 };
  }

  return { width: 300, height: 300 };
}
