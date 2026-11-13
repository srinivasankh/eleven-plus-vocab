import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows, toHeadword } from "@/lib/vocabSeed";
import { ParseResult } from "@/lib/types";

const baseEntry = {
  type: "Adjective",
  meaning: "calm",
  synonyms: ["peaceful"],
  antonyms: [],
  examples: ["A serene lake."],
};

describe("buildSeedRows", () => {
  it("normalises headwords and maps difficulty", () => {
    expect(toHeadword("  Serene ")).toBe("serene");

    const parsed: ParseResult = {
      entries: [
        { ...baseEntry, id: 2, setNumber: 1, word: "Elect" },
        { ...baseEntry, id: 1, setNumber: 1, word: "Ajar" },
      ],
      warnings: [],
      stats: { totalBlocks: 2, valid: 2, invalid: 0 },
    };

    const rows = buildSeedRows(parsed);
    expect(rows.setNumbers).toEqual([1]);
    expect(rows.words.map((word) => word.id)).toEqual([1, 2]);
    expect(rows.words[0]).toMatchObject({ headword: "ajar", difficulty: "hard" });
    expect(rows.words[1]).toMatchObject({ headword: "elect", difficulty: "easy" });
  });

  it("rejects entries without a set and duplicate ids", () => {
    const stats = { totalBlocks: 1, valid: 1, invalid: 0 };
    expect(() =>
      buildSeedRows({ entries: [{ ...baseEntry, id: 1, setNumber: null, word: "X" }], warnings: [], stats }),
    ).toThrow(/Set N/);
    expect(() =>
      buildSeedRows({
        entries: [
          { ...baseEntry, id: 1, setNumber: 1, word: "X" },
          { ...baseEntry, id: 1, setNumber: 1, word: "Y" },
        ],
        warnings: [],
        stats,
      }),
    ).toThrow(/Duplicate/);
  });

  it("produces 48 sets of 20 words from the real source file", () => {
    const markdown = fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8");
    const rows = buildSeedRows(parseVocabMarkdown(markdown));

    expect(rows.words).toHaveLength(960);
    expect(rows.setNumbers).toHaveLength(48);
    for (const set of rows.setNumbers) {
      expect(rows.words.filter((word) => word.setNumber === set)).toHaveLength(20);
    }
    expect(new Set(rows.words.map((word) => word.headword)).size).toBe(878);
  });
});
