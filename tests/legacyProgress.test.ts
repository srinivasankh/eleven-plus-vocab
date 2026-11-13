import { describe, expect, it } from "vitest";
import { parseLegacyProgress } from "@/lib/legacyProgress";
import { legacyProgressSchema } from "@/lib/validation";

const now = new Date("2026-11-13T12:00:00.000Z");

describe("parseLegacyProgress", () => {
  it("returns null when there's nothing worth importing", () => {
    expect(parseLegacyProgress(null, now)).toBeNull();
    expect(parseLegacyProgress("junk", now)).toBeNull();
    // The old app saved this empty default on a first visit.
    expect(parseLegacyProgress({ learnedWordIds: [], quizHistory: [], preferences: { questionsPerQuiz: 10 } }, now)).toBeNull();
  });

  it("keeps well-formed items only, de-duplicated", () => {
    const parsed = parseLegacyProgress(
      {
        learnedWordIds: [3, 3, 7, -1, 2.5, "9", 12],
        quizHistory: [
          { ts: "2026-02-01T10:00:00.000Z", score: 4, total: 5 },
          { ts: "2026-02-02T10:00:00.000Z", score: 9, total: 5 }, // score > total
          { ts: "2026-02-03T10:00:00.000Z", score: 3, total: 7 }, // not a real length
          { ts: "not a date", score: 1, total: 5 },
          { ts: "2030-01-01T00:00:00.000Z", score: 1, total: 5 }, // in the future
          { ts: "2026-02-04T10:00:00Z", score: 10, total: 10 },
        ],
      },
      now,
    );
    expect(parsed).toEqual({
      learnedWordIds: [3, 7, 12],
      quizHistory: [
        { ts: "2026-02-01T10:00:00.000Z", score: 4, total: 5 },
        { ts: "2026-02-04T10:00:00.000Z", score: 10, total: 10 },
      ],
    });
    expect(legacyProgressSchema.safeParse(parsed).success).toBe(true);
  });

  it("caps very large blobs", () => {
    const parsed = parseLegacyProgress({ learnedWordIds: Array.from({ length: 5000 }, (_, i) => i + 1) }, now);
    expect(parsed?.learnedWordIds).toHaveLength(2000);
  });
});

describe("legacyProgressSchema (server-side check)", () => {
  it("rejects anything the browser shouldn't have sent", () => {
    const ok = { learnedWordIds: [1], quizHistory: [] };
    expect(legacyProgressSchema.safeParse(ok).success).toBe(true);
    expect(legacyProgressSchema.safeParse({ ...ok, learnedWordIds: [0] }).success).toBe(false);
    expect(
      legacyProgressSchema.safeParse({ ...ok, quizHistory: [{ ts: "2026-01-01T00:00:00Z", score: 6, total: 5 }] }).success,
    ).toBe(false);
    expect(
      legacyProgressSchema.safeParse({ ...ok, quizHistory: [{ ts: "2099-01-01T00:00:00Z", score: 1, total: 5 }] }).success,
    ).toBe(false);
    expect(legacyProgressSchema.safeParse({ ...ok, learnedWordIds: Array(2001).fill(1) }).success).toBe(false);
  });
});
