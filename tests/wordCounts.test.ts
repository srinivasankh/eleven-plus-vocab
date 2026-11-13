import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import { countLearnedWords, countWords, countWordsByDifficulty } from "@/lib/wordCounts";

const words = buildSeedRows(
  parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8")),
).words;

describe("word counts on the Learn page", () => {
  it("counts each word once, even though 78 appear in two sets", () => {
    expect(words).toHaveLength(960);
    expect(countWords(words)).toBe(878);
    expect(countWordsByDifficulty(words)).toEqual({ easy: 232, medium: 341, hard: 305 });
  });

  it("adds 1, not 2, to a group's mastered count when a repeated word is learned", () => {
    // Found in review: learning "Serene" (#42 and #839, both Medium) added 2 to "mastered".
    const medium = words.filter((word) => word.difficulty === "medium");
    expect(medium.filter((word) => word.headword === "serene")).toHaveLength(2);
    expect(countLearnedWords(medium, new Set(["serene"]))).toBe(1);
    expect(countLearnedWords(medium, new Set())).toBe(0);
  });
});
