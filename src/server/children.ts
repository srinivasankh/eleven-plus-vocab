import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { MAX_CHILDREN } from "@/lib/validation";
import { getDb } from "@/server/db";
import { child, ChildRow, user } from "@/server/db/schema";

export type ChildProfile = Pick<ChildRow, "id" | "displayName">;

export async function listChildren(parentId: string): Promise<ChildProfile[]> {
  return getDb()
    .select({ id: child.id, displayName: child.displayName })
    .from(child)
    .where(eq(child.parentId, parentId))
    .orderBy(asc(child.createdAt), asc(child.id));
}

/** Returns the child only if it belongs to this parent — the ownership check for every request. */
export async function getChildForParent(parentId: string, childId: string): Promise<ChildProfile | null> {
  const [row] = await getDb()
    .select({ id: child.id, displayName: child.displayName })
    .from(child)
    .where(and(eq(child.id, childId), eq(child.parentId, parentId)))
    .limit(1);
  return row ?? null;
}

export class TooManyChildrenError extends Error {
  constructor() {
    super(`A family can have at most ${MAX_CHILDREN} profiles.`);
  }
}

/** `displayName` must already be validated with `childNameSchema`. */
export async function createChild(parentId: string, displayName: string): Promise<ChildProfile> {
  return getDb().transaction(async (tx) => {
    // Lock this parent's row so simultaneous "add learner" requests take turns; otherwise each
    // could count 5, pass the check, and insert (found in review: up to 13 profiles).
    await tx.select({ id: user.id }).from(user).where(eq(user.id, parentId)).for("update");

    const [{ value: existing }] = await tx
      .select({ value: count() })
      .from(child)
      .where(eq(child.parentId, parentId));
    if (existing >= MAX_CHILDREN) throw new TooManyChildrenError();

    const [row] = await tx
      .insert(child)
      .values({ parentId, displayName })
      .returning({ id: child.id, displayName: child.displayName });
    return row;
  });
}

/**
 * Removes one of this parent's learners and everything saved for them (learned words, quiz
 * rounds and answers cascade). Returns false if the child doesn't exist or isn't theirs.
 */
export async function deleteChild(parentId: string, childId: string): Promise<boolean> {
  const removed = await getDb()
    .delete(child)
    .where(and(eq(child.id, childId), eq(child.parentId, parentId)))
    .returning({ id: child.id });
  return removed.length > 0;
}

/**
 * Deletes a parent's account and everything in it: sign-in sessions, password or Google link,
 * learners and all their progress (every table cascades from `user`). Immediate and permanent.
 */
export async function deleteParentAccount(parentId: string): Promise<boolean> {
  const removed = await getDb().delete(user).where(eq(user.id, parentId)).returning({ id: user.id });
  return removed.length > 0;
}
