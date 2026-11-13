import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { childIdSchema } from "@/lib/validation";
import { getAuth } from "@/server/auth";
import { ChildProfile, getChildForParent } from "@/server/children";
import { log } from "@/server/log";

export const ACTIVE_CHILD_COOKIE = "ws_child";

export type Parent = { id: string; name: string; email: string };

/** The signed-in parent, or null. Cached per request. */
export const getParent = cache(async (): Promise<Parent | null> => {
  const result = await getAuth().api.getSession({ headers: await headers() });
  if (!result) return null;
  return { id: result.user.id, name: result.user.name, email: result.user.email };
});

/** The active child for the signed-in parent, or null. Ownership is re-checked every request. */
export const getActiveChild = cache(async (): Promise<ChildProfile | null> => {
  const parent = await getParent();
  if (!parent) return null;
  const raw = (await cookies()).get(ACTIVE_CHILD_COOKIE)?.value;
  if (!raw) return null;
  const parsed = childIdSchema.safeParse(raw);
  const owned = parsed.success ? await getChildForParent(parent.id, parsed.data) : null;
  // A cookie naming someone else's (or a deleted) child: possible tampering, worth seeing in logs.
  if (!owned) log.warn("session.child_not_owned", { parentId: parent.id });
  return owned;
});

export async function requireParent(nextPath?: string): Promise<Parent> {
  const parent = await getParent();
  if (!parent) redirect(nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in");
  return parent;
}

export async function requireChild(nextPath?: string): Promise<{ parent: Parent; child: ChildProfile }> {
  const parent = await requireParent(nextPath);
  const child = await getActiveChild();
  if (!child) redirect("/profiles");
  return { parent, child };
}

export async function setActiveChildCookie(childId: string) {
  (await cookies()).set(ACTIVE_CHILD_COOKIE, childId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function clearActiveChildCookie() {
  (await cookies()).delete(ACTIVE_CHILD_COOKIE);
}
