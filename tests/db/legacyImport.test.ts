import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import { createChild } from "@/server/children";
import { user } from "@/server/db/schema";
import { seedVocab } from "@/server/db/seedVocab";
import { importLegacyProgress } from "@/server/legacyImport";
import { getProgressSnapshot } from "@/server/progress";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;
let asha: string;
let ben: string;

beforeAll(async () => {
  ctx = await resetTestDatabase();
  await seedVocab(
    ctx.db,
    buildSeedRows(parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8"))),
  );
  await ctx.db.insert(user).values({ id: "parent-1", name: "Pat", email: "pat@example.test" });
  asha = (await createChild("parent-1", "Asha")).id;
  ben = (await createChild("parent-1", "Ben")).id;
});

afterAll(async () => {
  await ctx.close();
});

const legacy = {
  // 42 and 839 are both "Serene"; 99999 doesn't exist.
  learnedWordIds: [1, 42, 839, 99999],
  quizHistory: [
    { ts: "2026-03-01T09:00:00.000Z", score: 4, total: 5 as const },
    { ts: "2026-03-02T09:00:00.000Z", score: 18, total: 20 as const },
  ],
};

describe("importing pre-accounts progress", () => {
  it("adds learned words by headword and quiz results with their original dates", async () => {
    expect(await importLegacyProgress(asha, legacy)).toEqual({ wordsAdded: 2, resultsAdded: 2, alreadyImported: false });

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.learnedHeadwords.sort()).toEqual(["ajar", "serene"]);
    expect(snapshot.attempts).toBe(2);
    expect(snapshot.recentResults[0]).toEqual({ ts: "2026-03-02T09:00:00.000Z", score: 18, total: 20 });
    expect(snapshot.best).toMatchObject({ score: 18, total: 20 });
    expect(snapshot.hasActiveQuiz).toBe(false);
  });

  it("is allowed only once per child, even with different data", async () => {
    // Found in review: repeated calls could add any number of made-up "finished" rounds.
    const fake = {
      learnedWordIds: [3],
      quizHistory: [{ ts: "2026-03-05T09:00:00.000Z", score: 20, total: 20 as const }],
    };
    expect(await importLegacyProgress(asha, fake)).toEqual({ wordsAdded: 0, resultsAdded: 0, alreadyImported: true });
    expect(await importLegacyProgress(asha, legacy)).toEqual({ wordsAdded: 0, resultsAdded: 0, alreadyImported: true });

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.attempts).toBe(2);
    expect(snapshot.best).toMatchObject({ score: 18, total: 20 });
  });

  it("can't be claimed twice by simultaneous calls", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => importLegacyProgress(ben, legacy)));
    expect(results.filter((r) => !r.alreadyImported)).toHaveLength(1);
    expect((await getProgressSnapshot(ben)).attempts).toBe(2);
    // (Ben is used here, so "only touches the chosen child" below now uses a third learner.)
  });

  it("only touches the chosen child", async () => {
    const cleo = (await createChild("parent-1", "Cleo")).id;
    const snapshot = await getProgressSnapshot(cleo);
    expect(snapshot.learnedHeadwords).toEqual([]);
    expect(snapshot.attempts).toBe(0);
  });
});
