import "server-only";
import { and, asc, count, eq } from "drizzle-orm";
import { MAX_CHILDREN } from "@/lib/validation";
import { getDb } from "@/server/db";
import { child, ChildRow } from "@/server/db/schema";

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
