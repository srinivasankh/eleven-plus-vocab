import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import { seedVocab } from "@/server/db/seedVocab";
import { getAllWords } from "@/server/vocab";
import { resetTestDatabase } from "./helpers";

const rows = buildSeedRows(
  parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8")),
);

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;

beforeAll(async () => {
  ctx = await resetTestDatabase();
});

afterAll(async () => {
  await ctx.close();
});

describe("vocabulary in the database", () => {
  it("seeds all 960 words and is idempotent", async () => {
    const first = await seedVocab(ctx.db, rows);
    expect(first).toEqual({ sets: 48, words: 960, removed: 0 });

    const second = await seedVocab(ctx.db, rows);
    expect(second).toEqual({ sets: 48, words: 960, removed: 0 });
  });

  it("returns words in source order with difficulty and headword", async () => {
    const words = await getAllWords();
    expect(words).toHaveLength(960);
    expect(words[0]).toMatchObject({ id: 1, word: "Ajar", headword: "ajar", setNumber: 1 });
    expect(words[959]).toMatchObject({ id: 960, setNumber: 48 });

    const counts = { easy: 0, medium: 0, hard: 0 };
    for (const word of words) counts[word.difficulty] += 1;
    expect(counts).toEqual({ easy: 244, medium: 381, hard: 335 });
  });

  it("updates changed words and removes words dropped from the source", async () => {
    const edited = {
      setNumbers: rows.setNumbers,
      words: rows.words.slice(0, 959).map((word) =>
        word.id === 1 ? { ...word, meaning: "slightly open" } : word,
      ),
    };

    const result = await seedVocab(ctx.db, edited);
    expect(result.removed).toBe(1);

    const words = await getAllWords();
    expect(words).toHaveLength(959);
    expect(words[0].meaning).toBe("slightly open");

    await seedVocab(ctx.db, rows); // restore
    expect(await getAllWords()).toHaveLength(960);
  });
});
