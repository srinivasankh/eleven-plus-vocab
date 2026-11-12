import { notInArray, sql } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { SeedRows } from "@/lib/vocabSeed";
import * as schema from "@/server/db/schema";

const BATCH = 200;

/**
 * Idempotently loads the word list: inserts new words, updates changed ones and removes words
 * that are no longer in the source. Runs in one transaction, so a failure leaves the previous
 * word list intact. Deliberately has no `server-only` import so scripts and tests can use it.
 */
export async function seedVocab(
  db: PostgresJsDatabase<typeof schema>,
  rows: SeedRows,
): Promise<{ sets: number; words: number; removed: number }> {
  return db.transaction(async (tx) => {
    if (rows.setNumbers.length > 0) {
      await tx
        .insert(schema.vocabSets)
        .values(rows.setNumbers.map((number) => ({ number })))
        .onConflictDoNothing();
    }

    for (let i = 0; i < rows.words.length; i += BATCH) {
      const batch = rows.words.slice(i, i + BATCH).map((entry) => ({
        id: entry.id,
        setNumber: entry.setNumber as number,
        word: entry.word,
        headword: entry.headword,
        type: entry.type,
        meaning: entry.meaning,
        difficulty: entry.difficulty,
        synonyms: entry.synonyms,
        antonyms: entry.antonyms,
        examples: entry.examples,
      }));

      await tx
        .insert(schema.words)
        .values(batch)
        .onConflictDoUpdate({
          target: schema.words.id,
          set: {
            setNumber: sql`excluded.set_number`,
            word: sql`excluded.word`,
            headword: sql`excluded.headword`,
            type: sql`excluded.type`,
            meaning: sql`excluded.meaning`,
            difficulty: sql`excluded.difficulty`,
            synonyms: sql`excluded.synonyms`,
            antonyms: sql`excluded.antonyms`,
            examples: sql`excluded.examples`,
            updatedAt: sql`now()`,
          },
        });
    }

    const ids = rows.words.map((entry) => entry.id);
    const removed = ids.length
      ? await tx.delete(schema.words).where(notInArray(schema.words.id, ids)).returning({ id: schema.words.id })
      : await tx.delete(schema.words).returning({ id: schema.words.id });

    const setNumbers = rows.setNumbers;
    if (setNumbers.length) {
      await tx.delete(schema.vocabSets).where(notInArray(schema.vocabSets.number, setNumbers));
    }

    return { sets: setNumbers.length, words: rows.words.length, removed: removed.length };
  });
}
