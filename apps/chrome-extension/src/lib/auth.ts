import { SERVER_URL } from "./config";

export interface Session {
  user: { id: string; name: string; email: string; image?: string };
}

export async function getSession(): Promise<Session | null> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/get-session`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  } catch {
    return null;
  }
}
