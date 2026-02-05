import { ProgressState, QuizLength } from "@/lib/types";

export const PROGRESS_KEY = "eleven_plus_quiz_progress_v1";

export const defaultProgressState: ProgressState = {
  lastUpdated: new Date(0).toISOString(),
  learnedWordIds: [],
  quizHistory: [],
  preferences: {
    questionsPerQuiz: 10,
  },
};

function isQuizLength(value: unknown): value is QuizLength {
  return value === 5 || value === 10 || value === 20;
}

export function sanitizeProgressState(value: unknown): ProgressState {
  if (!value || typeof value !== "object") {
    return { ...defaultProgressState };
  }

  const raw = value as Partial<ProgressState>;

  const learnedWordIds = Array.isArray(raw.learnedWordIds)
    ? raw.learnedWordIds.filter((item): item is number => Number.isInteger(item))
    : [];

  const quizHistory = Array.isArray(raw.quizHistory)
    ? raw.quizHistory.filter(
        (item): item is { ts: string; score: number; total: number } =>
          !!item &&
          typeof item.ts === "string" &&
          Number.isInteger(item.score) &&
          Number.isInteger(item.total),
      )
    : [];

  const questionsPerQuiz = isQuizLength(raw.preferences?.questionsPerQuiz)
    ? raw.preferences.questionsPerQuiz
    : 10;

  const activeQuiz = raw.activeQuiz;
  const activeQuizValid =
    activeQuiz &&
    Number.isInteger(activeQuiz.questionIndex) &&
    Array.isArray(activeQuiz.answers) &&
    Array.isArray(activeQuiz.questionIds);

  return {
    lastUpdated: typeof raw.lastUpdated === "string" ? raw.lastUpdated : new Date().toISOString(),
    learnedWordIds,
    quizHistory,
    activeQuiz: activeQuizValid
      ? {
          questionIndex: activeQuiz.questionIndex,
          answers: activeQuiz.answers.filter((answer): answer is number => Number.isInteger(answer)),
          questionIds: activeQuiz.questionIds.filter((id): id is string => typeof id === "string"),
        }
      : undefined,
    preferences: {
      questionsPerQuiz,
    },
  };
}

export function loadProgressState(): ProgressState {
  if (typeof window === "undefined") {
    return { ...defaultProgressState };
  }

  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      return { ...defaultProgressState };
    }

    return sanitizeProgressState(JSON.parse(raw));
  } catch {
    return { ...defaultProgressState };
  }
}

export function saveProgressState(state: ProgressState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PROGRESS_KEY,
    JSON.stringify({
      ...state,
      lastUpdated: new Date().toISOString(),
    }),
  );
}
