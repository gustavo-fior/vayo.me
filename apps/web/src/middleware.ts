import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (sessionCookie && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/bookmarks", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
