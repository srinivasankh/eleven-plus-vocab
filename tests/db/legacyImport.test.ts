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
    expect(await importLegacyProgress(asha, legacy)).toEqual({ wordsAdded: 2, resultsAdded: 2 });

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.learnedHeadwords.sort()).toEqual(["ajar", "serene"]);
    expect(snapshot.attempts).toBe(2);
    expect(snapshot.recentResults[0]).toEqual({ ts: "2026-03-02T09:00:00.000Z", score: 18, total: 20 });
    expect(snapshot.best).toMatchObject({ score: 18, total: 20 });
    expect(snapshot.hasActiveQuiz).toBe(false);
  });

  it("is safe to run twice", async () => {
    expect(await importLegacyProgress(asha, legacy)).toEqual({ wordsAdded: 0, resultsAdded: 0 });
    expect((await getProgressSnapshot(asha)).attempts).toBe(2);
  });

  it("only touches the chosen child", async () => {
    const snapshot = await getProgressSnapshot(ben);
    expect(snapshot.learnedHeadwords).toEqual([]);
    expect(snapshot.attempts).toBe(0);
  });
});
