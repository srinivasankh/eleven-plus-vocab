import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createChild, deleteChild, deleteParentAccount, listChildren } from "@/server/children";
import { account, child, learnedWord, quizAttempt, quizQuestion, session, user } from "@/server/db/schema";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;

async function family(id: string) {
  await ctx.db.insert(user).values({ id, name: `Parent ${id}`, email: `${id}@example.test` });
  await ctx.db.insert(session).values({
    id: `s-${id}`,
    token: `t-${id}`,
    userId: id,
    expiresAt: new Date(Date.now() + 86_400_000),
    ipAddress: "203.0.113.9",
  });
  await ctx.db.insert(account).values({ id: `a-${id}`, accountId: `g-${id}`, providerId: "google", userId: id });
  const kid = await createChild(id, `Kid of ${id}`);
  await ctx.db.insert(learnedWord).values({ childId: kid.id, headword: "serene" });
  const [attempt] = await ctx.db
    .insert(quizAttempt)
    .values({ childId: kid.id, total: 5 })
    .returning({ id: quizAttempt.id });
  await ctx.db.insert(quizQuestion).values({
    attemptId: attempt.id,
    position: 0,
    prompt: "calm",
    options: ["a", "b", "c", "d"],
    correctIndex: 0,
  });
  return { parentId: id, childId: kid.id, attemptId: attempt.id };
}

beforeAll(async () => {
  ctx = await resetTestDatabase();
});

afterAll(async () => {
  await ctx.close();
});

describe("removing a learner", () => {
  it("removes the learner and all their progress", async () => {
    const f = await family("del-a");
    expect(await deleteChild(f.parentId, f.childId)).toBe(true);
    expect(await listChildren(f.parentId)).toHaveLength(0);
    expect(await ctx.db.select().from(learnedWord).where(eq(learnedWord.childId, f.childId))).toHaveLength(0);
    expect(await ctx.db.select().from(quizAttempt).where(eq(quizAttempt.childId, f.childId))).toHaveLength(0);
    expect(await ctx.db.select().from(quizQuestion).where(eq(quizQuestion.attemptId, f.attemptId))).toHaveLength(0);
  });

  it("can't remove another family's learner", async () => {
    const mine = await family("del-b");
    const theirs = await family("del-c");
    expect(await deleteChild(mine.parentId, theirs.childId)).toBe(false);
    expect(await listChildren(theirs.parentId)).toHaveLength(1);
  });
});

describe("deleting an account", () => {
  it("removes the parent, sessions, sign-in links, learners and progress — and nothing of anyone else's", async () => {
    const gone = await family("del-d");
    const kept = await family("del-e");
    expect(await deleteParentAccount(gone.parentId)).toBe(true);

    expect(await ctx.db.select().from(user).where(eq(user.id, gone.parentId))).toHaveLength(0);
    expect(await ctx.db.select().from(session).where(eq(session.userId, gone.parentId))).toHaveLength(0);
    expect(await ctx.db.select().from(account).where(eq(account.userId, gone.parentId))).toHaveLength(0);
    expect(await ctx.db.select().from(child).where(eq(child.parentId, gone.parentId))).toHaveLength(0);
    expect(await ctx.db.select().from(learnedWord).where(eq(learnedWord.childId, gone.childId))).toHaveLength(0);
    expect(await ctx.db.select().from(quizQuestion).where(eq(quizQuestion.attemptId, gone.attemptId))).toHaveLength(0);

    expect(await listChildren(kept.parentId)).toHaveLength(1);
    expect(await ctx.db.select().from(session).where(eq(session.userId, kept.parentId))).toHaveLength(1);
  });

  it("reports when there was nothing to delete", async () => {
    expect(await deleteParentAccount("no-such-parent")).toBe(false);
  });
});
