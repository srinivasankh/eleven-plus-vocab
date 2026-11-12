"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fieldErrors, learnerNextPath, signInSchema, signUpSchema } from "@/lib/validation";
import { getAuth } from "@/server/auth";
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

function authErrorMessage(error: unknown): string {
  if (isAPIError(error)) {
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code && friendlyAuthErrors[code]) return friendlyAuthErrors[code];
    if (error.status === 429 || error.statusCode === 429) {
      return "Too many attempts. Please wait a minute and try again.";
    }
  }
  console.error("[auth] unexpected error", error);
  return "Something went wrong. Please try again.";
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

  try {
    await getAuth().api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    return { errors: { form: authErrorMessage(error) }, values };
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

  try {
    await getAuth().api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    return { errors: { form: authErrorMessage(error) }, values };
  }

  // A different parent may have used this browser before: never inherit their child.
  // So always pick a learner first, then continue to where they were heading.
  await clearActiveChildCookie();
  const next = learnerNextPath(formData.get("next"));
  redirect(next === "/learn" ? "/profiles" : `/profiles?next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } finally {
    await clearActiveChildCookie();
  }
  redirect("/");
}
