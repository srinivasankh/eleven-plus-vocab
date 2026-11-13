/**
 * Google sign-in helpers that don't need a server (unit-tested in tests/googleAuth.test.ts).
 */

export type GoogleCredentials = { clientId: string; clientSecret: string };

/** Google sign-in is switched on only when both values are set; otherwise the button is hidden. */
export function googleCredentials(env: Record<string, string | undefined>): GoogleCredentials | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const PARENT_NAME_MAX = 60;
export const FALLBACK_PARENT_NAME = "Parent";

/**
 * The name Google gives us is not something the parent typed, so it must never block sign-in:
 * tidy it to fit the same rule as the sign-up form (1–60 characters) instead of rejecting it.
 */
export function nameFromProvider(name: unknown): string {
  const tidy = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
  if (!tidy) return FALLBACK_PARENT_NAME;
  return Array.from(tidy).slice(0, PARENT_NAME_MAX).join("").trim();
}

/** Better Auth's OAuth callback marks its own requests with this path. */
export function isOAuthCallbackPath(path: unknown): boolean {
  return typeof path === "string" && path.startsWith("/callback/");
}

/**
 * Better Auth sends people back to the sign-in page with `?error=<code>` when Google sign-in
 * fails. Turn the codes we expect into friendly words; anything else gets a general message.
 */
export function googleErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  switch (code) {
    case "access_denied":
      return "Google sign-in was cancelled. You can try again, or use your email and password.";
    case "account_not_linked":
      return "This email already has a WordSpark account. Please sign in with your email and password.";
    case "email_not_found":
      return "Google didn't share an email address, so we couldn't sign you in.";
    default:
      return "Google sign-in didn't work this time. Please try again.";
  }
}
