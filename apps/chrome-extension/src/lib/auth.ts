import { SERVER_URL } from "./config";
import { getSessionCookie } from "./cookies";

export interface Session {
  user: { id: string; name: string; email: string; image?: string };
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookie = await getSessionCookie();
    if (!cookie) return null;

    const res = await fetch(`${SERVER_URL}/auth/get-session`, {
      headers: { Cookie: cookie },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}
