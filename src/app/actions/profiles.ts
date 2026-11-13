"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { childIdSchema, childNameSchema, DELETE_ACCOUNT_WORD, learnerNextPath } from "@/lib/validation";
import { getAuth } from "@/server/auth";
import {
  createChild,
  deleteChild,
  deleteParentAccount,
  getChildForParent,
  TooManyChildrenError,
} from "@/server/children";
import { log } from "@/server/log";
import { clearActiveChildCookie, getActiveChild, requireParent, setActiveChildCookie } from "@/server/session";

export type ChildFormState = { error?: string; value?: string };

export async function createChildAction(_prev: ChildFormState, formData: FormData): Promise<ChildFormState> {
  const parent = await requireParent("/profiles");
  const value = String(formData.get("displayName") ?? "");
  const parsed = childNameSchema.safeParse(value);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message, value };

  let childId: string;
  try {
    childId = (await createChild(parent.id, parsed.data)).id;
  } catch (error) {
    if (error instanceof TooManyChildrenError) return { error: error.message, value };
    log.error("profiles.create_failed", error, { parentId: parent.id });
    return { error: "Something went wrong. Please try again.", value };
  }

  await setActiveChildCookie(childId);
  redirect(learnerNextPath(formData.get("next")));
}

export async function selectChildAction(formData: FormData) {
  const parent = await requireParent("/profiles");
  const parsed = childIdSchema.safeParse(formData.get("childId"));
  // Ownership check: a child id from another family is treated as not found.
  const owned = parsed.success ? await getChildForParent(parent.id, parsed.data) : null;
  if (!owned) {
    log.warn("profiles.select_not_owned", { parentId: parent.id });
    redirect("/profiles");
  }

  await setActiveChildCookie(owned.id);
  redirect(learnerNextPath(formData.get("next")));
}

export type ManageFormState = { error?: string };

/** Removes one learner and all their progress. Only the parent's own learners can be removed. */
export async function removeChildAction(_prev: ManageFormState, formData: FormData): Promise<ManageFormState> {
  const parent = await requireParent("/profiles");
  const parsed = childIdSchema.safeParse(formData.get("childId"));
  if (!parsed.success) return { error: "That learner couldn't be found." };

  const active = await getActiveChild();
  let removed: boolean;
  try {
    removed = await deleteChild(parent.id, parsed.data);
  } catch (error) {
    log.error("profiles.remove_failed", error, { parentId: parent.id });
    return { error: "Something went wrong. Please try again." };
  }
  if (!removed) {
    log.warn("profiles.remove_not_owned", { parentId: parent.id });
    return { error: "That learner couldn't be found." };
  }

  log.info("profiles.removed", { parentId: parent.id, childId: parsed.data });
  if (active?.id === parsed.data) await clearActiveChildCookie();
  redirect("/profiles");
}

/**
 * Deletes the parent's account and everything in it, immediately. The parent confirms by typing
 * DELETE (works for Google accounts too, which have no password to re-enter).
 */
export async function deleteAccountAction(_prev: ManageFormState, formData: FormData): Promise<ManageFormState> {
  const parent = await requireParent("/profiles");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== DELETE_ACCOUNT_WORD) {
    return { error: `Type ${DELETE_ACCOUNT_WORD} in the box to confirm.` };
  }

  try {
    if (!(await deleteParentAccount(parent.id))) throw new Error("Account row not found");
  } catch (error) {
    log.error("account.delete_failed", error, { parentId: parent.id });
    return { error: "Something went wrong, and nothing was deleted. Please try again." };
  }
  log.info("account.deleted", { parentId: parent.id });

  // The sessions are gone with the account; also clear this browser's cookies.
  await getAuth()
    .api.signOut({ headers: await headers() })
    .catch(() => undefined);
  const jar = await cookies();
  for (const { name } of jar.getAll()) {
    if (name.includes("better-auth")) jar.delete(name);
  }
  await clearActiveChildCookie();
  redirect("/sign-in?notice=account_deleted");
}
