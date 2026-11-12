"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { QuizLength, QuizView } from "@/lib/types";
import { answerSchema, quizLengthSchema } from "@/lib/validation";
import {
  answerQuestion,
  finishQuiz,
  InvalidAnswerError,
  QuizIncompleteError,
  QuizNotFoundError,
  startQuiz,
} from "@/server/quiz";
import { requireChild } from "@/server/session";
import type { ActionResult } from "@/app/actions/progress";

const TRY_AGAIN = "Something went wrong. Please try again.";

function failure(error: unknown, context: string): { ok: false; error: string } {
  if (error instanceof QuizNotFoundError) {
    return { ok: false, error: "This quiz has ended. Start a new mission to keep practising." };
  }
  if (error instanceof QuizIncompleteError || error instanceof InvalidAnswerError) {
    return { ok: false, error: error.message };
  }
  console.error(`[quiz] ${context} failed`, error);
  return { ok: false, error: TRY_AGAIN };
}

export async function startQuizAction(length: QuizLength): Promise<ActionResult<QuizView>> {
  const { child } = await requireChild();
  const parsed = quizLengthSchema.safeParse(length);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    const quiz = await startQuiz(child.id, parsed.data);
    revalidatePath("/");
    return { ok: true, data: quiz };
  } catch (error) {
    return failure(error, "start");
  }
}

export async function answerQuestionAction(input: {
  attemptId: string;
  position: number;
  chosenIndex: number;
}): Promise<ActionResult<{ chosenIndex: number; correctIndex: number }>> {
  const { child } = await requireChild();
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    const { attemptId, position, chosenIndex } = parsed.data;
    return { ok: true, data: await answerQuestion(child.id, attemptId, position, chosenIndex) };
  } catch (error) {
    return failure(error, "answer");
  }
}

export async function finishQuizAction(attemptId: string): Promise<ActionResult<QuizView>> {
  const { child } = await requireChild();
  const parsed = z.string().uuid().safeParse(attemptId);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    const quiz = await finishQuiz(child.id, parsed.data);
    revalidatePath("/progress");
    revalidatePath("/");
    return { ok: true, data: quiz };
  } catch (error) {
    return failure(error, "finish");
  }
}
