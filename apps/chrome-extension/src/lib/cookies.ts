import { APP_URL, SERVER_URL } from "./config";

export async function getSessionCookie(): Promise<string | null> {
  // Check app URL, www variant, and server URL (covers both prod and dev)
  const seen = new Set<string>();
  const urls = [APP_URL, APP_URL.replace("://", "://www."), SERVER_URL];

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const cookies = await chrome.cookies.getAll({ url });
    const sessionCookie = cookies.find((c) => c.name.endsWith(".session_token"));
    if (sessionCookie) return `${sessionCookie.name}=${sessionCookie.value}`;
  }

  return null;
}
