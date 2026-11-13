import { NextRequest, NextResponse } from "next/server";
import { afterSignInPath } from "@/lib/validation";
import { ACTIVE_CHILD_COOKIE } from "@/server/session";

/**
 * Where Google sign-in lands after Better Auth has set the session. Like the password form:
 * forget any learner a previous parent picked on this browser, then open the learner picker.
 * Visiting it without signing in does no harm (the picker sends you to sign-in).
 */
export function GET(request: NextRequest) {
  const destination = new URL(afterSignInPath(request.nextUrl.searchParams.get("next")), request.nextUrl.origin);
  const response = NextResponse.redirect(destination, 303);
  response.cookies.delete(ACTIVE_CHILD_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
