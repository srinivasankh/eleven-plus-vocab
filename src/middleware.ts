import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

/**
 * Fast first gate: no session cookie → send to sign-in. This only checks the cookie *exists*;
 * every page and server action still verifies the session and child ownership on the server
 * (requireParent / requireChild).
 */
export function middleware(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/learn/:path*", "/quiz/:path*", "/progress/:path*", "/profiles/:path*"],
};
