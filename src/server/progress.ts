import "server-only";
import { and, countDistinct, desc, eq, sql } from "drizzle-orm";
import { ProgressSnapshot, QuizLength, QuizResult } from "@/lib/types";
import { getDb } from "@/server/db";
import { child, learnedWord, quizAttempt, words } from "@/server/db/schema";

// Every function here takes a childId that the caller has ALREADY checked belongs to the
// signed-in parent (requireChild()). They never accept a child id straight from the browser.

const RECENT = 8;

type FinishedRow = { finishedAt: Date | null; score: number | null; total: number };

/** Only called for finished rounds, where the CHECK constraint guarantees score and finishedAt. */
function toResult(row: FinishedRow): QuizResult {
  return { ts: (row.finishedAt as Date).toISOString(), score: row.score as number, total: row.total };
}

export async function getProgressSnapshot(childId: string): Promise<ProgressSnapshot> {
  const db = getDb();
  const finished = and(eq(quizAttempt.childId, childId), eq(quizAttempt.status, "finished"));

  const [learnedRows, [{ totalWords }], recentRows, [{ attempts }], [bestRow], [childRow], [active]] = await Promise.all([
    db.select({ headword: learnedWord.headword }).from(learnedWord).where(eq(learnedWord.childId, childId)),
    db.select({ totalWords: countDistinct(words.headword) }).from(words),
    db
      .select({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total })
      .from(quizAttempt)
      .where(finished)
      .orderBy(desc(quizAttempt.finishedAt))
      .limit(RECENT),
    db.select({ attempts: sql<number>`count(*)::int` }).from(quizAttempt).where(finished),
    db
      .select({ finishedAt: quizAttempt.finishedAt, score: quizAttempt.score, total: quizAttempt.total })
      .from(quizAttempt)
      .where(finished)
      .orderBy(sql`${quizAttempt.score}::float / ${quizAttempt.total} desc`, desc(quizAttempt.finishedAt))
      .limit(1),
    db.select({ preferredQuizLength: child.preferredQuizLength }).from(child).where(eq(child.id, childId)),
    db
      .select({ id: quizAttempt.id })
      .from(quizAttempt)
      .where(and(eq(quizAttempt.childId, childId), eq(quizAttempt.status, "in_progress")))
      .limit(1),
  ]);

  return {
    learnedHeadwords: learnedRows.map((row) => row.headword),
    totalWords,
    attempts,
    recentResults: recentRows.map(toResult),
    best: bestRow ? toResult(bestRow) : null,
    preferredQuizLength: (childRow?.preferredQuizLength ?? 10) as QuizLength,
    hasActiveQuiz: Boolean(active),
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

export async function setPreferredQuizLength(childId: string, length: QuizLength): Promise<void> {
  await getDb().update(child).set({ preferredQuizLength: length }).where(eq(child.id, childId));
}

/** Clears one child's learned words and quiz history, including any unfinished round (not their profile). */
export async function resetProgress(childId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx.delete(learnedWord).where(eq(learnedWord.childId, childId));
    await tx.delete(quizAttempt).where(eq(quizAttempt.childId, childId));
  });
}
