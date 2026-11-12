/**
 * Browser storage for the one thing that still lives on the device: a half-finished quiz
 * (moves to the server in stage 4). Stored per child, so siblings on one device never see each
 * other's quiz. Every access is wrapped so a browser that blocks storage can't crash the app.
 */

export type ActiveQuiz = {
  questionIndex: number;
  answers: number[];
  questionIds: string[];
};

export const ACTIVE_QUIZ_KEY_PREFIX = "eleven_plus_active_quiz_v1:";

/** Pre-accounts progress blob (learned words, history). Read-only from now on; see stage 5 import. */
export const LEGACY_PROGRESS_KEY = "eleven_plus_quiz_progress_v1";

export function activeQuizKey(childId: string): string {
  return `${ACTIVE_QUIZ_KEY_PREFIX}${childId}`;
}

export function sanitizeActiveQuiz(value: unknown): ActiveQuiz | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Partial<ActiveQuiz>;
  if (!Number.isInteger(raw.questionIndex) || !Array.isArray(raw.answers) || !Array.isArray(raw.questionIds)) {
    return undefined;
  }

  return {
    questionIndex: raw.questionIndex as number,
    answers: raw.answers.filter((answer): answer is number => Number.isInteger(answer)),
    questionIds: raw.questionIds.filter((id): id is string => typeof id === "string"),
  };
}

export function loadActiveQuiz(childId: string): ActiveQuiz | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(activeQuizKey(childId));
    return raw ? sanitizeActiveQuiz(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

export function saveActiveQuiz(childId: string, quiz: ActiveQuiz | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (quiz) {
      window.localStorage.setItem(activeQuizKey(childId), JSON.stringify(quiz));
    } else {
      window.localStorage.removeItem(activeQuizKey(childId));
    }
  } catch {
    // Storage blocked or full: the quiz still works, it just can't be resumed later.
  }
}
