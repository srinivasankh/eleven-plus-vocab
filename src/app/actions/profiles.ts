"use server";

import { redirect } from "next/navigation";
import { childIdSchema, childNameSchema, learnerNextPath } from "@/lib/validation";
import { createChild, getChildForParent, TooManyChildrenError } from "@/server/children";
import { log } from "@/server/log";
import { requireParent, setActiveChildCookie } from "@/server/session";

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
