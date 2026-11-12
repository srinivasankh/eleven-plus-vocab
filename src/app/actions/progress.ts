"use server";

import { revalidatePath } from "next/cache";
import { QuizLength, QuizResult } from "@/lib/types";
import { quizLengthSchema, quizResultSchema, setLearnedSchema } from "@/lib/validation";
import {
  recordQuizResult,
  resetProgress,
  setPreferredQuizLength,
  setWordLearned,
  UnknownWordError,
} from "@/server/progress";
import { requireChild } from "@/server/session";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const TRY_AGAIN = "We couldn't save that. Please try again.";

export async function setLearnedAction(input: { wordId: number; learned: boolean }): Promise<ActionResult<string>> {
  const { child } = await requireChild();
  const parsed = setLearnedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    const headword = await setWordLearned(child.id, parsed.data.wordId, parsed.data.learned);
    revalidatePath("/progress");
    return { ok: true, data: headword };
  } catch (error) {
    if (!(error instanceof UnknownWordError)) console.error("[progress] setLearned failed", error);
    return { ok: false, error: TRY_AGAIN };
  }
}

/**
 * Saves a finished quiz. Until stage 4 the score is computed in the browser, so this only
 * checks that it is plausible; stage 4 moves scoring to the server.
 */
export async function recordQuizResultAction(input: { score: number; total: number }): Promise<ActionResult<QuizResult>> {
  const { child } = await requireChild();
  const parsed = quizResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    const result = await recordQuizResult(child.id, parsed.data.score, parsed.data.total);
    revalidatePath("/progress");
    revalidatePath("/");
    return { ok: true, data: result };
  } catch (error) {
    console.error("[progress] recordQuizResult failed", error);
    return { ok: false, error: TRY_AGAIN };
  }
}

export async function setQuizLengthAction(length: QuizLength): Promise<ActionResult> {
  const { child } = await requireChild();
  const parsed = quizLengthSchema.safeParse(length);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };

  try {
    await setPreferredQuizLength(child.id, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("[progress] setQuizLength failed", error);
    return { ok: false, error: TRY_AGAIN };
  }
}

export async function resetProgressAction(): Promise<ActionResult> {
  const { child } = await requireChild();
  try {
    await resetProgress(child.id);
    revalidatePath("/progress");
    revalidatePath("/learn");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("[progress] reset failed", error);
    return { ok: false, error: TRY_AGAIN };
  }
}
