import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildSeedRows } from "@/lib/vocabSeed";
import { createChild } from "@/server/children";
import { quizAttempt, quizQuestion, user } from "@/server/db/schema";
import { seedVocab } from "@/server/db/seedVocab";
import { getProgressSnapshot, resetProgress } from "@/server/progress";
import {
  answerQuestion,
  finishQuiz,
  getActiveQuiz,
  InvalidAnswerError,
  QuizIncompleteError,
  QuizNotFoundError,
  startQuiz,
} from "@/server/quiz";
import { resetTestDatabase } from "./helpers";

let ctx: Awaited<ReturnType<typeof resetTestDatabase>>;
let asha: string;
let ben: string;

beforeAll(async () => {
  ctx = await resetTestDatabase();
  await seedVocab(
    ctx.db,
    buildSeedRows(parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8"))),
  );
  await ctx.db.insert(user).values([
    { id: "parent-1", name: "Pat", email: "pat@example.test" },
    { id: "parent-2", name: "Robin", email: "robin@example.test" },
  ]);
  asha = (await createChild("parent-1", "Asha")).id;
  ben = (await createChild("parent-2", "Ben")).id; // a different family
});

afterAll(async () => {
  await ctx.close();
});

async function correctIndexes(attemptId: string): Promise<number[]> {
  const rows = await ctx.db
    .select({ position: quizQuestion.position, correctIndex: quizQuestion.correctIndex })
    .from(quizQuestion)
    .where(eq(quizQuestion.attemptId, attemptId));
  return rows.sort((a, b) => a.position - b.position).map((row) => row.correctIndex);
}

describe("a quiz round on the server", () => {
  it("starts a round without revealing any answers", async () => {
    const quiz = await startQuiz(asha, 10);
    expect(quiz.status).toBe("in_progress");
    expect(quiz.questions).toHaveLength(10);
    for (const question of quiz.questions) {
      expect(question.correctIndex).toBeNull();
      expect(question.chosenIndex).toBeNull();
      expect(new Set(question.options.map((option) => option.toLowerCase())).size).toBe(4);
    }

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.hasActiveQuiz).toBe(true);
    expect(snapshot.preferredQuizLength).toBe(10);
    expect(snapshot.attempts).toBe(0); // unfinished rounds aren't counted
  });

  it("resumes exactly as it was left (same questions, same option order, saved answers)", async () => {
    const before = (await getActiveQuiz(asha))!;
    const answer = await answerQuestion(asha, before.attemptId, 0, 2);
    expect(answer.chosenIndex).toBe(2);
    expect(answer.correctIndex).toBeGreaterThanOrEqual(0);

    const resumed = (await getActiveQuiz(asha))!;
    expect(resumed.attemptId).toBe(before.attemptId);
    expect(resumed.questions.map((q) => q.options)).toEqual(before.questions.map((q) => q.options));
    expect(resumed.questions[0]).toMatchObject({ chosenIndex: 2, correctIndex: answer.correctIndex });
    expect(resumed.questions[1].correctIndex).toBeNull();
  });

  it("keeps the first answer and rejects impossible ones", async () => {
    const quiz = (await getActiveQuiz(asha))!;
    const again = await answerQuestion(asha, quiz.attemptId, 0, 3);
    expect(again.chosenIndex).toBe(2); // unchanged

    await expect(answerQuestion(asha, quiz.attemptId, 1, 4)).rejects.toBeInstanceOf(InvalidAnswerError);
    await expect(answerQuestion(asha, quiz.attemptId, 99, 0)).rejects.toBeInstanceOf(QuizNotFoundError);
  });

  it("never lets another child see, answer or finish the round", async () => {
    const quiz = (await getActiveQuiz(asha))!;
    expect(await getActiveQuiz(ben)).toBeNull();
    await expect(answerQuestion(ben, quiz.attemptId, 1, 0)).rejects.toBeInstanceOf(QuizNotFoundError);
    await expect(finishQuiz(ben, quiz.attemptId)).rejects.toBeInstanceOf(QuizNotFoundError);
  });

  it("refuses to finish until every question is answered, then scores on the server", async () => {
    const quiz = (await getActiveQuiz(asha))!;
    await expect(finishQuiz(asha, quiz.attemptId)).rejects.toBeInstanceOf(QuizIncompleteError);

    // Answer questions 1..9: right on odd positions, wrong on even ones.
    const correct = await correctIndexes(quiz.attemptId);
    for (let position = 1; position < 10; position += 1) {
      const choice = position % 2 === 1 ? correct[position] : (correct[position] + 1) % 4;
      await answerQuestion(asha, quiz.attemptId, position, choice);
    }
    const expected = [2, ...correct.slice(1).map((c, i) => ((i + 1) % 2 === 1 ? c : (c + 1) % 4))].filter(
      (choice, position) => choice === correct[position],
    ).length;

    const finished = await finishQuiz(asha, quiz.attemptId);
    expect(finished.status).toBe("finished");
    expect(finished.score).toBe(expected);
    expect(finished.questions.every((q) => q.correctIndex !== null)).toBe(true);

    expect(await finishQuiz(asha, quiz.attemptId)).toMatchObject({ score: expected }); // idempotent
    await expect(answerQuestion(asha, quiz.attemptId, 0, 0)).rejects.toBeInstanceOf(QuizNotFoundError);

    const snapshot = await getProgressSnapshot(asha);
    expect(snapshot.attempts).toBe(1);
    expect(snapshot.hasActiveQuiz).toBe(false);
    expect(snapshot.recentResults[0]).toMatchObject({ score: expected, total: 10 });
  });

  it("replaces an unfinished round when a new one starts", async () => {
    const first = await startQuiz(asha, 5);
    const second = await startQuiz(asha, 20);
    expect(second.attemptId).not.toBe(first.attemptId);
    expect((await getActiveQuiz(asha))!.attemptId).toBe(second.attemptId);

    const rows = await ctx.db.select({ id: quizAttempt.id }).from(quizAttempt).where(eq(quizAttempt.id, first.attemptId));
    expect(rows).toHaveLength(0);
    expect((await getProgressSnapshot(asha)).preferredQuizLength).toBe(20);
  });

  it("reset also clears an unfinished round", async () => {
    await resetProgress(asha);
    expect(await getActiveQuiz(asha)).toBeNull();
    expect((await getProgressSnapshot(asha)).attempts).toBe(0);
  });
});
