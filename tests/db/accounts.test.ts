import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { child, user } from "@/server/db/schema";
import { createChild, getChildForParent, listChildren, TooManyChildrenError } from "@/server/children";
import { MAX_CHILDREN } from "@/lib/validation";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;

async function makeParent(id: string) {
  await ctx.db.insert(user).values({ id, name: `Parent ${id}`, email: `${id}@example.test` });
  return id;
}

beforeAll(async () => {
  ctx = await resetTestDatabase();
});

afterAll(async () => {
  await ctx.close();
});

describe("child profiles", () => {
  it("lists only a parent's own children, in creation order", async () => {
    const a = await makeParent("parent-a");
    const b = await makeParent("parent-b");

    const asha = await createChild(a, "Asha");
    const ben = await createChild(a, "Ben");
    await createChild(b, "Cleo");

    expect((await listChildren(a)).map((c) => c.displayName)).toEqual(["Asha", "Ben"]);
    expect((await listChildren(b)).map((c) => c.displayName)).toEqual(["Cleo"]);
    expect(asha.id).not.toBe(ben.id);
  });

  it("never returns another family's child", async () => {
    const [cleo] = await listChildren("parent-b");
    expect(await getChildForParent("parent-b", cleo.id)).toMatchObject({ displayName: "Cleo" });
    expect(await getChildForParent("parent-a", cleo.id)).toBeNull();
    expect(await getChildForParent("parent-a", "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it(`caps a family at ${MAX_CHILDREN} profiles`, async () => {
    const c = await makeParent("parent-c");
    for (let i = 0; i < MAX_CHILDREN; i += 1) await createChild(c, `Kid ${i}`);
    await expect(createChild(c, "One too many")).rejects.toBeInstanceOf(TooManyChildrenError);
    expect(await listChildren(c)).toHaveLength(MAX_CHILDREN);
  });

  it("removes a family's children when the parent account is deleted", async () => {
    const { eq } = await import("drizzle-orm");
    await ctx.db.delete(user).where(eq(user.id, "parent-c"));
    expect(await ctx.db.select().from(child).where(eq(child.parentId, "parent-c"))).toHaveLength(0);
  });
});
