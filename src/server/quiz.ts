import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { buildQuiz, QuizWord, Rng, scoreAnswers } from "@/lib/quiz";
import { QuizLength, QuizView } from "@/lib/types";
import { getDb } from "@/server/db";
import { child, quizAttempt, quizQuestion, words } from "@/server/db/schema";

// Every function takes a childId the caller has ALREADY verified (requireChild()), and every
// query is scoped by it, so one child can never read or change another child's round.

const cryptoRng: Rng = (maxExclusive) => randomInt(maxExclusive);

export class QuizNotFoundError extends Error {
  constructor() {
    super("That quiz could not be found.");
  }
}

export class QuizIncompleteError extends Error {
  constructor() {
    super("Answer every question before finishing.");
  }
}

export class InvalidAnswerError extends Error {
  constructor() {
    super("That answer isn't one of the options.");
  }
}

type AttemptRow = typeof quizAttempt.$inferSelect;
type QuestionRow = typeof quizQuestion.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Db = ReturnType<typeof getDb> | Tx;

function toView(attempt: AttemptRow, questions: QuestionRow[]): QuizView {
  return {
    attemptId: attempt.id,
    status: attempt.status,
    total: attempt.total as QuizLength,
    score: attempt.score,
    questions: questions.map((question) => ({
      position: question.position,
      prompt: question.prompt,
      options: question.options,
      chosenIndex: question.chosenIndex,
      // Never reveal the answer to a question that hasn't been answered yet.
      correctIndex: question.chosenIndex === null ? null : question.correctIndex,
    })),
  };
}

async function questionsFor(db: Db, attemptId: string): Promise<QuestionRow[]> {
  return db.select().from(quizQuestion).where(eq(quizQuestion.attemptId, attemptId)).orderBy(asc(quizQuestion.position));
}

async function quizWords(db: Db): Promise<QuizWord[]> {
  return db
    .select({ id: words.id, word: words.word, headword: words.headword, type: words.type, meaning: words.meaning })
    .from(words);
}

/** The child's unfinished round, if any. */
export async function getActiveQuiz(childId: string): Promise<QuizView | null> {
  const db = getDb();
  const [attempt] = await db
    .select()
    .from(quizAttempt)
    .where(and(eq(quizAttempt.childId, childId), eq(quizAttempt.status, "in_progress")))
    .limit(1);
  return attempt ? toView(attempt, await questionsFor(db, attempt.id)) : null;
}

/** Starts a new round, replacing any unfinished one, and remembers the chosen length. */
export async function startQuiz(childId: string, length: QuizLength, rng: Rng = cryptoRng): Promise<QuizView> {
  return getDb().transaction(async (tx) => {
    const built = buildQuiz(await quizWords(tx), length, rng);

    await tx.delete(quizAttempt).where(and(eq(quizAttempt.childId, childId), eq(quizAttempt.status, "in_progress")));
    const [attempt] = await tx.insert(quizAttempt).values({ childId, total: length }).returning();
    const questions = await tx
      .insert(quizQuestion)
      .values(
        built.map((question, position) => ({
          attemptId: attempt.id,
          position,
          wordId: question.wordId,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.correctIndex,
        })),
      )
      .returning();
    await tx.update(child).set({ preferredQuizLength: length }).where(eq(child.id, childId));

    return toView(attempt, questions.sort((a, b) => a.position - b.position));
  });
}

/**
 * Records an answer and reveals the correct one. Answers are final: answering the same question
 * again (e.g. a double click) returns the first answer unchanged.
 */
export async function answerQuestion(
  childId: string,
  attemptId: string,
  position: number,
  chosenIndex: number,
): Promise<{ chosenIndex: number; correctIndex: number }> {
  const db = getDb();
  const [attempt] = await db
    .select({ id: quizAttempt.id })
    .from(quizAttempt)
    .where(and(eq(quizAttempt.id, attemptId), eq(quizAttempt.childId, childId), eq(quizAttempt.status, "in_progress")))
    .limit(1);
  if (!attempt) throw new QuizNotFoundError();

  const [updated] = await db
    .update(quizQuestion)
    .set({ chosenIndex, answeredAt: sql`now()` })
    .where(
      and(
        eq(quizQuestion.attemptId, attemptId),
        eq(quizQuestion.position, position),
        isNull(quizQuestion.chosenIndex),
        sql`${chosenIndex} between 0 and cardinality(${quizQuestion.options}) - 1`,
      ),
    )
    .returning({ chosenIndex: quizQuestion.chosenIndex, correctIndex: quizQuestion.correctIndex });
  if (updated) return { chosenIndex: updated.chosenIndex as number, correctIndex: updated.correctIndex };

  const [existing] = await db
    .select({ chosenIndex: quizQuestion.chosenIndex, correctIndex: quizQuestion.correctIndex })
    .from(quizQuestion)
    .where(and(eq(quizQuestion.attemptId, attemptId), eq(quizQuestion.position, position)))
    .limit(1);
  if (!existing) throw new QuizNotFoundError();
  if (existing.chosenIndex === null) throw new InvalidAnswerError();
  return { chosenIndex: existing.chosenIndex, correctIndex: existing.correctIndex };
}

/** Scores the round on the server. Finishing twice returns the same result. */
export async function finishQuiz(childId: string, attemptId: string): Promise<QuizView> {
  return getDb().transaction(async (tx) => {
    const [attempt] = await tx
      .select()
      .from(quizAttempt)
      .where(and(eq(quizAttempt.id, attemptId), eq(quizAttempt.childId, childId)))
      .for("update")
      .limit(1);
    if (!attempt) throw new QuizNotFoundError();

    const questions = await questionsFor(tx, attemptId);
    if (attempt.status === "finished") return toView(attempt, questions);
    if (questions.some((question) => question.chosenIndex === null)) throw new QuizIncompleteError();

    const [finished] = await tx
      .update(quizAttempt)
      .set({ status: "finished", score: scoreAnswers(questions), finishedAt: sql`now()` })
      .where(eq(quizAttempt.id, attemptId))
      .returning();
    return toView(finished, questions);
  });
}
