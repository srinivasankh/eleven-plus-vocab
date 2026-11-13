/**
 * Progress saved in the browser by the pre-accounts version of WordSpark, under one
 * localStorage key per browser. It can be imported once into a child's account.
 */

export const LEGACY_PROGRESS_KEY = "eleven_plus_quiz_progress_v1";
export const LEGACY_IMPORTED_KEY = "eleven_plus_quiz_progress_v1_imported";
export const LEGACY_DISMISSED_KEY = "eleven_plus_legacy_import_dismissed_v1";

export const LEGACY_MAX_WORDS = 2000;
export const LEGACY_MAX_RESULTS = 500;

export type LegacyProgress = {
  learnedWordIds: number[];
  quizHistory: { ts: string; score: number; total: 5 | 10 | 20 }[];
};

/**
 * Tolerant reader for the old blob: keeps only well-formed items, drops duplicates, caps sizes.
 * Returns null when there is nothing worth importing.
 */
export function parseLegacyProgress(raw: unknown, now = new Date()): LegacyProgress | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { learnedWordIds?: unknown; quizHistory?: unknown };

  const learnedWordIds = Array.isArray(value.learnedWordIds)
    ? [...new Set(value.learnedWordIds.filter((id): id is number => Number.isInteger(id) && (id as number) > 0))].slice(
        0,
        LEGACY_MAX_WORDS,
      )
    : [];

  const latest = now.getTime() + 24 * 60 * 60 * 1000;
  const quizHistory = Array.isArray(value.quizHistory)
    ? value.quizHistory
        .filter((item): item is { ts: string; score: number; total: 5 | 10 | 20 } => {
          if (!item || typeof item !== "object") return false;
          const { ts, score, total } = item as Record<string, unknown>;
          const time = typeof ts === "string" ? Date.parse(ts) : NaN;
          return (
            Number.isFinite(time) &&
            time <= latest &&
            (total === 5 || total === 10 || total === 20) &&
            Number.isInteger(score) &&
            (score as number) >= 0 &&
            (score as number) <= total
          );
        })
        .map((item) => ({ ts: new Date(item.ts).toISOString(), score: item.score, total: item.total }))
        .slice(-LEGACY_MAX_RESULTS)
    : [];

  if (learnedWordIds.length === 0 && quizHistory.length === 0) return null;
  return { learnedWordIds, quizHistory };
}
