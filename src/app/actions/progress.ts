"use server";

import { revalidatePath } from "next/cache";
import { setLearnedSchema } from "@/lib/validation";
import {
  resetProgress,
  setWordLearned,
  UnknownWordError,
} from "@/server/progress";
import { log } from "@/server/log";
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
    if (error instanceof UnknownWordError) log.warn("progress.set_learned.unknown_word", { childId: child.id });
    else log.error("progress.set_learned.failed", error, { childId: child.id });
    return { ok: false, error: TRY_AGAIN };
  }
}

export async function resetProgressAction(): Promise<ActionResult> {
  const { child } = await requireChild();
  try {
    await resetProgress(child.id);
    log.info("progress.reset", { childId: child.id });
    revalidatePath("/progress");
    revalidatePath("/learn");
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch (error) {
    log.error("progress.reset.failed", error, { childId: child.id });
    return { ok: false, error: TRY_AGAIN };
  }
}
