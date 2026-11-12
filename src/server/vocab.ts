import "server-only";
import { asc } from "drizzle-orm";
import { WordEntry } from "@/lib/types";
import { getDb } from "@/server/db";
import { words } from "@/server/db/schema";

/** All words in source order (by id). */
export async function getAllWords(): Promise<WordEntry[]> {
  const rows = await getDb()
    .select({
      id: words.id,
      setNumber: words.setNumber,
      word: words.word,
      headword: words.headword,
      type: words.type,
      meaning: words.meaning,
      difficulty: words.difficulty,
      synonyms: words.synonyms,
      antonyms: words.antonyms,
      examples: words.examples,
    })
    .from(words)
    .orderBy(asc(words.id));

  return rows;
}
