import "server-only";
import { and, countDistinct, desc, eq, sql } from "drizzle-orm";
import { ProgressSnapshot, QuizLength, QuizResult } from "@/lib/types";
import { getDb } from "@/server/db";
import { child, learnedWord, quizAttempt, words } from "@/server/db/schema";

// Every function here takes a childId that the caller has ALREADY checked belongs to the
// signed-in parent (requireChild()). They never accept a child id straight from the browser.

const RECENT = 8;

function toResult(row: { finishedAt: Date; score: number; total: number }): QuizResult {
  return { ts: row.finishedAt.toISOString(), score: row.score, total: row.total };
}

export async function getProgressSnapshot(childId: string): Promise<ProgressSnapshot> {
  const db = getDb();

  const [learnedRows, [{ totalWords }], recentRows, [{ attempts }], [bestRow], [childRow]] = await Promise.all([
    db.select({ headword: learnedWord.headword }).from(learnedWord).where(eq(learnedWord.childId, childId)),
    db.select({ totalWords: countDistinct(words.headword) }).from(words),
    db
      .select({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total })
      .from(quizAttempt)
      .where(eq(quizAttempt.childId, childId))
      .orderBy(desc(quizAttempt.finishedAt))
      .limit(RECENT),
    db.select({ attempts: sql<number>`count(*)::int` }).from(quizAttempt).where(eq(quizAttempt.childId, childId)),
    db
      .select({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total })
      .from(quizAttempt)
      .where(eq(quizAttempt.childId, childId))
      .orderBy(sql`${quizAttempt.score}::float / ${quizAttempt.total} desc`, desc(quizAttempt.finishedAt))
      .limit(1),
    db.select({ preferredQuizLength: child.preferredQuizLength }).from(child).where(eq(child.id, childId)),
  ]);

  return {
    learnedHeadwords: learnedRows.map((row) => row.headword),
    totalWords,
    attempts,
    recentResults: recentRows.map(toResult),
    best: bestRow ? toResult(bestRow) : null,
    preferredQuizLength: (childRow?.preferredQuizLength ?? 10) as QuizLength,
  };
}

export class UnknownWordError extends Error {
  constructor(wordId: number) {
    super(`No word with id ${wordId}.`);
  }
}

/** Marks or unmarks a word as learned. Applies to every entry sharing the word's headword. */
export async function setWordLearned(childId: string, wordId: number, learned: boolean): Promise<string> {
  const db = getDb();
  const [word] = await db.select({ headword: words.headword }).from(words).where(eq(words.id, wordId)).limit(1);
  if (!word) throw new UnknownWordError(wordId);

  if (learned) {
    await db.insert(learnedWord).values({ childId, headword: word.headword }).onConflictDoNothing();
  } else {
    await db
      .delete(learnedWord)
      .where(and(eq(learnedWord.childId, childId), eq(learnedWord.headword, word.headword)));
  }
  return word.headword;
}

/** `score`/`total` must already be validated (total ∈ {5,10,20}, 0 ≤ score ≤ total). */
export async function recordQuizResult(childId: string, score: number, total: QuizLength): Promise<QuizResult> {
  const [row] = await getDb()
    .insert(quizAttempt)
    .values({ childId, score, total })
    .returning({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total });
  return toResult(row);
}

export async function setPreferredQuizLength(childId: string, length: QuizLength): Promise<void> {
  await getDb().update(child).set({ preferredQuizLength: length }).where(eq(child.id, childId));
}

/** Clears one child's learned words and quiz history (not their profile). */
export async function resetProgress(childId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.delete(learnedWord).where(eq(learnedWord.childId, childId));
    await tx.delete(quizAttempt).where(eq(quizAttempt.childId, childId));
  });
}
