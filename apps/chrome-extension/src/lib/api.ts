import { SERVER_URL } from "./config";
import { getSessionCookie } from "./cookies";

async function getHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const cookie = await getSessionCookie();
  if (cookie) headers["Cookie"] = cookie;
  return headers;
}

async function trpcQuery<T = unknown>(path: string, input?: unknown): Promise<T> {
  const url = new URL(`${SERVER_URL}/trpc/${path}`);
  if (input !== undefined) {
    url.searchParams.set("input", JSON.stringify(input));
  }
  const res = await fetch(url.toString(), { headers: await getHeaders() });
  if (!res.ok) throw new Error(`trpc query failed: ${res.status}`);
  const json = await res.json();
  return json.result.data;
}

async function trpcMutation<T = unknown>(path: string, input: unknown): Promise<T> {
  const res = await fetch(`${SERVER_URL}/trpc/${path}`, {
    method: "POST",
    headers: await getHeaders({ "Content-Type": "application/json" }),
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
