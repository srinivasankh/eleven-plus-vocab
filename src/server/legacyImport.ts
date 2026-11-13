import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { LegacyProgress } from "@/lib/legacyProgress";
import { getDb } from "@/server/db";
import { learnedWord, quizAttempt, words } from "@/server/db/schema";

/**
 * Adds pre-accounts browser progress to a child (already verified by the caller). Safe to run
 * twice: learned words are a set, and quiz results already present (same time, score and
 * length) are skipped. Unknown word ids are ignored.
 */
export async function importLegacyProgress(
  childId: string,
  data: LegacyProgress,
): Promise<{ wordsAdded: number; resultsAdded: number }> {
  return getDb().transaction(async (tx) => {
    let wordsAdded = 0;
    if (data.learnedWordIds.length > 0) {
      const known = await tx
        .selectDistinct({ headword: words.headword })
        .from(words)
        .where(inArray(words.id, data.learnedWordIds));
      if (known.length > 0) {
        const inserted = await tx
          .insert(learnedWord)
          .values(known.map(({ headword }) => ({ childId, headword })))
          .onConflictDoNothing()
          .returning({ headword: learnedWord.headword });
        wordsAdded = inserted.length;
      }
    }

    let resultsAdded = 0;
    if (data.quizHistory.length > 0) {
      const existing = await tx
        .select({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total })
        .from(quizAttempt)
        .where(and(eq(quizAttempt.childId, childId), eq(quizAttempt.status, "finished")));
      const seen = new Set(existing.map((row) => `${row.finishedAt?.getTime()}|${row.score}|${row.total}`));

      const fresh = data.quizHistory.filter((item) => {
        const key = `${Date.parse(item.ts)}|${item.score}|${item.total}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (fresh.length > 0) {
        await tx.insert(quizAttempt).values(
          fresh.map((item) => ({
            childId,
            status: "finished" as const,
            total: item.total,
            score: item.score,
            startedAt: new Date(item.ts),
            finishedAt: new Date(item.ts),
          })),
        );
        resultsAdded = fresh.length;
      }
    }

    return { wordsAdded, resultsAdded };
  });
}
