"use server";

import { revalidatePath } from "next/cache";
import { legacyProgressSchema } from "@/lib/validation";
import { importLegacyProgress } from "@/server/legacyImport";
import { log } from "@/server/log";
import { requireChild } from "@/server/session";
import type { ActionResult } from "@/app/actions/progress";

export async function importLegacyProgressAction(input: unknown): Promise<
  ActionResult<{ wordsAdded: number; resultsAdded: number; alreadyImported: boolean }>
> {
  const { child } = await requireChild();
  const parsed = legacyProgressSchema.safeParse(input);
  if (!parsed.success) {
    log.warn("legacy_import.invalid", { childId: child.id });
    return { ok: false, error: "We couldn't read the progress saved on this device." };
  }

  try {
    const result = await importLegacyProgress(child.id, parsed.data);
    log.info("legacy_import.done", { childId: child.id, ...result });
    revalidatePath("/");
    revalidatePath("/progress");
    revalidatePath("/learn");
    return { ok: true, data: result };
  } catch (error) {
    log.error("legacy_import.failed", error, { childId: child.id });
    return { ok: false, error: "We couldn't add that progress. Please try again." };
  }
}
