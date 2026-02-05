import { describe, expect, it } from "vitest";
import { sanitizeProgressState } from "@/lib/storage";

describe("storage sanitizer", () => {
  it("returns defaults for invalid payload", () => {
    const sanitized = sanitizeProgressState("bad");
    expect(sanitized.learnedWordIds).toEqual([]);
    expect(sanitized.preferences.questionsPerQuiz).toBe(10);
  });

  it("preserves valid active quiz", () => {
    const sanitized = sanitizeProgressState({
      lastUpdated: "2026-01-01T00:00:00.000Z",
      learnedWordIds: [1, 2],
      quizHistory: [{ ts: "2026-01-01T00:00:00.000Z", score: 4, total: 5 }],
      activeQuiz: {
        questionIndex: 2,
        answers: [0, 1, -1],
        questionIds: ["q-10", "q-11", "q-12"],
      },
      preferences: {
        questionsPerQuiz: 20,
      },
    });

    expect(sanitized.activeQuiz?.questionIndex).toBe(2);
    expect(sanitized.preferences.questionsPerQuiz).toBe(20);
  });
});
