import { SERVER_URL } from "./config";

async function trpcQuery<T = unknown>(path: string, input?: unknown): Promise<T> {
  const url = new URL(`${SERVER_URL}/trpc/${path}`);
  if (input !== undefined) {
    url.searchParams.set("input", JSON.stringify(input));
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`trpc query failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

async function trpcMutation<T = unknown>(path: string, input: unknown): Promise<T> {
  const res = await fetch(`${SERVER_URL}/trpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`trpc mutation failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

export interface Folder {
  id: string;
  name: string;
  icon: string | null;
  type: "bookmarks" | "canvas";
}

export async function getFolders(): Promise<Folder[]> {
  return trpcQuery<Folder[]>("folders.getFolders");
}

export async function createBookmark(url: string, folderId: string) {
  return trpcMutation("bookmarks.createBookmark", { url, folderId });
}

export async function createAsset(
  url: string,
  folderId: string,
  assetType: "image" | "video"
) {
  return trpcMutation("canvasAssets.createAsset", { url, folderId, assetType });
}
