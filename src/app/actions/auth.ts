"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { afterSignInPath, fieldErrors, learnerNextPath, signInSchema, signUpSchema } from "@/lib/validation";
import { getAuth } from "@/server/auth";
import { log } from "@/server/log";
import {
  clientIp,
  consumeRateLimit,
  emailKey,
  ipKey,
  RateLimitRule,
  resetRateLimit,
  RULES,
} from "@/server/rateLimit";
import { clearActiveChildCookie } from "@/server/session";

export type AuthFormState = {
  errors?: Record<string, string>;
  values?: { name?: string; email?: string };
};

const friendlyAuthErrors: Record<string, string> = {
  USER_ALREADY_EXISTS: "An account with this email already exists. Try signing in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Try signing in instead.",
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match. Please try again.",
  PASSWORD_TOO_SHORT: "Passwords need at least 8 characters.",
  PASSWORD_TOO_LONG: "Passwords can be at most 128 characters.",
  INVALID_EMAIL: "Please enter a valid email address.",
};

function authErrorMessage(error: unknown, action: "sign_in" | "sign_up"): string {
  if (isAPIError(error)) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (error.status === 429 || error.statusCode === 429) {
      log.warn(`auth.${action}.rate_limited`);
      return "Too many attempts. Please wait a minute and try again.";
    }
    if (code && friendlyAuthErrors[code]) {
      log.warn(`auth.${action}.rejected`, { code });
      return friendlyAuthErrors[code];
    }
  }
  log.error(`auth.${action}.failed`, error);
  return "Something went wrong. Please try again.";
}

function tooManyAttempts(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
}

/**
 * Counts this attempt against every key; returns an error message if any limit is exceeded.
 * Fails closed: if the limiter can't run, the attempt is refused rather than let through.
 */
async function rateLimited(action: "sign_in" | "sign_up" | "google", checks: [string, RateLimitRule][]): Promise<string | null> {
  try {
    let wait = 0;
    for (const [key, rule] of checks) {
      const result = await consumeRateLimit(key, rule);
      if (!result.allowed) wait = Math.max(wait, result.retryAfterSeconds);
    }
    if (wait > 0) {
      log.warn(`auth.${action}.rate_limited`);
      return tooManyAttempts(wait);
    }
    return null;
  } catch (error) {
    log.error(`auth.${action}.rate_limit_unavailable`, error);
    return "Something went wrong. Please try again.";
  }
}

export async function signUpAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: raw.name, email: raw.email };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  const requestHeaders = await headers();
  const limited = await rateLimited("sign_up", [[ipKey("sign_up", clientIp(requestHeaders)), RULES.signUpPerIp]]);
  if (limited) return { errors: { form: limited }, values };

  try {
    const created = await getAuth().api.signUpEmail({ body: parsed.data, headers: requestHeaders });
    log.info("auth.sign_up", { parentId: created.user.id });
  } catch (error) {
    return { errors: { form: authErrorMessage(error, "sign_up") }, values };
  }

  await clearActiveChildCookie();
  redirect("/profiles");
}

export async function signInAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { email: raw.email };
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };

  // Server actions call Better Auth directly, which bypasses its HTTP rate limiter, so the
  // form path is limited here: per account (can't be forged) and per network address.
  const requestHeaders = await headers();
  const accountKey = emailKey("sign_in", parsed.data.email);
  const limited = await rateLimited("sign_in", [
    [accountKey, RULES.signInPerEmail],
    [ipKey("sign_in", clientIp(requestHeaders)), RULES.signInPerIp],
  ]);
  if (limited) return { errors: { form: limited }, values };

  try {
    await getAuth().api.signInEmail({ body: parsed.data, headers: requestHeaders });
  } catch (error) {
    return { errors: { form: authErrorMessage(error, "sign_in") }, values };
  }

  // The right password clears this account's failed-attempt count.
  await resetRateLimit(accountKey).catch((error) => log.error("auth.sign_in.rate_limit_reset_failed", error));

  // A different parent may have used this browser before: never inherit their child.
  // So always pick a learner first, then continue to where they were heading.
  await clearActiveChildCookie();
  redirect(afterSignInPath(formData.get("next")));
}

export type GoogleFormState = { error?: string };

/**
 * Starts "Continue with Google". Google sends the parent back to Better Auth's callback, which
 * signs them in (creating the account on first use) and then redirects to /auth/continue, which
 * clears any previous learner and opens the learner picker — the same as the password form.
 * On failure Better Auth redirects to /sign-in?error=<code> (see googleErrorMessage).
 */
export async function googleSignInAction(_prev: GoogleFormState, formData: FormData): Promise<GoogleFormState> {
  const next = learnerNextPath(formData.get("next"));
  const nextQuery = next === "/learn" ? "" : `?next=${encodeURIComponent(next)}`;

  const requestHeaders = await headers();
  // Each start writes a short-lived row (the OAuth state), so starts are limited per address.
  const limited = await rateLimited("google", [[ipKey("google_start", clientIp(requestHeaders)), RULES.googleStartPerIp]]);
  if (limited) return { error: limited };

  let url: string | undefined;
  try {
    const result = await getAuth().api.signInSocial({
      body: {
        provider: "google",
        callbackURL: `/auth/continue${nextQuery}`,
        newUserCallbackURL: "/auth/continue",
        errorCallbackURL: `/sign-in${nextQuery}`,
        disableRedirect: true,
      },
      headers: requestHeaders,
    });
    url = result.url;
  } catch (error) {
    log.error("auth.google.start_failed", error);
  }
  if (!url) return { error: "Google sign-in isn't available right now. Please use your email and password." };
  log.info("auth.google.started");
  redirect(url);
}

export async function signOutAction() {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } finally {
    await clearActiveChildCookie();
  }
  redirect("/");
}
