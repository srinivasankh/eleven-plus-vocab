import fs from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import { createChild } from "@/server/children";
import { child, learnedWord, quizAttempt, user } from "@/server/db/schema";
import { seedVocab } from "@/server/db/seedVocab";
import {
  getProgressSnapshot,
  recordQuizResult,
  resetProgress,
  setPreferredQuizLength,
  setWordLearned,
  UnknownWordError,
} from "@/server/progress";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;
let asha: string;
let ben: string;

beforeAll(async () => {
  ctx = await resetTestDatabase();
  const rows = buildSeedRows(
    parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8")),
  );
  await seedVocab(ctx.db, rows);
  await ctx.db.insert(user).values({ id: "parent-1", name: "Pat", email: "pat@example.test" });
  asha = (await createChild("parent-1", "Asha")).id;
  ben = (await createChild("parent-1", "Ben")).id;
});

afterAll(async () => {
  await ctx.close();
});

describe("learned words", () => {
  it("counts a word that appears in two sets once", async () => {
    // "Serene" is entry #42 and #839.
    expect(await setWordLearned(asha, 839, true)).toBe("serene");
    await setWordLearned(asha, 42, true); // same headword: no duplicate row

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.learnedHeadwords).toEqual(["serene"]);
    expect(snapshot.totalWords).toBe(878);

    await setWordLearned(asha, 42, false); // unlearning either entry unlearns the word
    expect((await getProgressSnapshot(asha)).learnedHeadwords).toEqual([]);
  });

  it("keeps each child's progress separate", async () => {
    await setWordLearned(asha, 1, true);
    expect((await getProgressSnapshot(asha)).learnedHeadwords).toEqual(["ajar"]);
    expect((await getProgressSnapshot(ben)).learnedHeadwords).toEqual([]);
  });

  it("rejects unknown words", async () => {
    await expect(setWordLearned(asha, 99999, true)).rejects.toBeInstanceOf(UnknownWordError);
  });
});

describe("quiz results", () => {
  it("records history newest first and picks the best by percentage", async () => {
    await recordQuizResult(ben, 5, 5);
    await recordQuizResult(ben, 9, 20);
    await recordQuizResult(ben, 7, 10);

    const snapshot = await getProgressSnapshot(ben);
    expect(snapshot.attempts).toBe(3);
    expect(snapshot.recentResults.map((r) => `${r.score}/${r.total}`)).toEqual(["7/10", "9/20", "5/5"]);
    expect(snapshot.best).toMatchObject({ score: 5, total: 5 }); // 100% beats a raw 9
    expect((await getProgressSnapshot(asha)).attempts).toBe(0);
  });

  it("is protected by database constraints as well as validation", async () => {
    await expect(ctx.db.insert(quizAttempt).values({ childId: ben, score: 6, total: 5 })).rejects.toThrow();
    await expect(ctx.db.insert(quizAttempt).values({ childId: ben, score: 1, total: 7 })).rejects.toThrow();
  });

  it("remembers each child's preferred quiz length", async () => {
    expect((await getProgressSnapshot(ben)).preferredQuizLength).toBe(10);
    await setPreferredQuizLength(ben, 20);
    expect((await getProgressSnapshot(ben)).preferredQuizLength).toBe(20);
    expect((await getProgressSnapshot(asha)).preferredQuizLength).toBe(10);
  });
});

describe("reset and deletion", () => {
  it("resets only the chosen child", async () => {
    await setWordLearned(ben, 2, true);
    await resetProgress(ben);

    const benNow = await getProgressSnapshot(ben);
    expect(benNow.learnedHeadwords).toEqual([]);
    expect(benNow.attempts).toBe(0);
    expect((await getProgressSnapshot(asha)).learnedHeadwords).toEqual(["ajar"]);
  });

  it("deletes a child's progress with the child", async () => {
    await recordQuizResult(asha, 3, 5);
    await ctx.db.delete(child).where(eq(child.id, asha));

    const [{ n: learned }] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(learnedWord)
      .where(eq(learnedWord.childId, asha));
    const [{ n: attempts }] = await ctx.db
      .select({ n: sql<number>`count(*)::int` })
      .from(quizAttempt)
      .where(eq(quizAttempt.childId, asha));
    expect([learned, attempts]).toEqual([0, 0]);
  });
});
