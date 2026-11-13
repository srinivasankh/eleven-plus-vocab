import { getDifficulty } from "@/lib/difficulty";
import { ParseResult, WordEntry } from "@/lib/types";

export function toHeadword(word: string): string {
  return word.trim().toLowerCase();
}

export type SeedRows = {
  setNumbers: number[];
  words: WordEntry[];
};

/**
 * Turns parsed markdown into rows for the database. Pure (no I/O) so it can be unit-tested.
 * Throws if an entry has no set heading above it or an id appears twice, because seeding
 * either would silently corrupt the word list.
 */
export function buildSeedRows(parsed: ParseResult): SeedRows {
  const seenIds = new Set<number>();
  const setNumbers = new Set<number>();
  const words: WordEntry[] = [];

  for (const entry of parsed.entries) {
    if (entry.setNumber === null) {
      throw new Error(`Entry ${entry.id} (${entry.word}) is not under a "# Set N" heading.`);
    }
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate entry id ${entry.id} (${entry.word}).`);
    }
    seenIds.add(entry.id);
    setNumbers.add(entry.setNumber);

    words.push({
      ...entry,
      headword: toHeadword(entry.word),
      difficulty: getDifficulty(entry.id),
    });
  }

  return {
    setNumbers: [...setNumbers].sort((a, b) => a - b),
    words: words.sort((a, b) => a.id - b.id),
  };
}
