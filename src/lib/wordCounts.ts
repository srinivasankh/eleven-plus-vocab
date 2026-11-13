import { Difficulty, WordEntry } from "@/lib/types";

// 78 words appear in two sets (with different wording), so the word list has more entries
// (cards) than words. Every count shown to a child counts *words*: a word learned once counts
// once, the same way the Progress page and the header do.

type CountableEntry = Pick<WordEntry, "headword" | "difficulty">;

export function countWords(entries: readonly CountableEntry[]): number {
  return new Set(entries.map((entry) => entry.headword)).size;
}

export function countLearnedWords(entries: readonly CountableEntry[], learned: ReadonlySet<string>): number {
  return new Set(entries.filter((entry) => learned.has(entry.headword)).map((entry) => entry.headword)).size;
}

export function countWordsByDifficulty(entries: readonly CountableEntry[]): Record<Difficulty, number> {
  return {
    easy: countWords(entries.filter((entry) => entry.difficulty === "easy")),
    medium: countWords(entries.filter((entry) => entry.difficulty === "medium")),
    hard: countWords(entries.filter((entry) => entry.difficulty === "hard")),
  };
}
