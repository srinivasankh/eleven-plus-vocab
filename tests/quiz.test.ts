import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseVocabMarkdown } from "@/lib/parseVocabMarkdown";
import { buildQuestion, buildQuiz, mathRandomRng, QuizWord, Rng, scoreAnswers, shuffle } from "@/lib/quiz";
import { buildSeedRows } from "@/lib/vocabSeed";

/** Small deterministic PRNG (mulberry32) so failures are reproducible. */
function seededRng(seed: number): Rng {
  let a = seed;
  return (max) => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

const realWords: QuizWord[] = buildSeedRows(
  parseVocabMarkdown(fs.readFileSync(path.join(process.cwd(), "Y5_set01_to_48.md"), "utf8")),
).words;

const word = (id: number, w: string, type = "Adjective"): QuizWord => ({
  id,
  word: w,
  headword: w.toLowerCase(),
  type,
  meaning: `meaning of ${w}`,
});

describe("buildQuestion", () => {
  it("never offers the answer twice, even when the word appears in two sets", () => {
    const serene = realWords.find((item) => item.id === 839)!;
    for (let seed = 1; seed <= 200; seed += 1) {
      const question = buildQuestion(serene, realWords, seededRng(seed));
      const lowered = question.options.map((option) => option.toLowerCase());
      expect(new Set(lowered).size).toBe(4);
      expect(lowered.filter((option) => option === "serene")).toHaveLength(1);
      expect(question.options[question.correctIndex]).toBe("Serene");
    }
  });

  it("prefers distractors of the same part of speech, falling back when there are too few", () => {
    const pool = [word(1, "Brisk"), word(2, "Calm"), word(3, "Humble"), word(4, "Jovial"), word(5, "Dwell", "Verb")];
    const adjective = buildQuestion(pool[0], pool, seededRng(7));
    expect(adjective.options).not.toContain("Dwell");

    const verb = buildQuestion(pool[4], pool, seededRng(7));
    expect(verb.options).toHaveLength(4);
    expect(verb.options[verb.correctIndex]).toBe("Dwell");
  });
});

describe("buildQuiz", () => {
  it("builds the requested number of questions on different words, every time", () => {
    for (const length of [5, 10, 20] as const) {
      for (let seed = 1; seed <= 25; seed += 1) {
        const questions = buildQuiz(realWords, length, seededRng(seed * length));
        expect(questions).toHaveLength(length);
        const headwords = questions.map((question) => question.options[question.correctIndex].toLowerCase());
        expect(new Set(headwords).size).toBe(length);
        for (const question of questions) {
          expect(question.options).toHaveLength(4);
          expect(new Set(question.options.map((option) => option.toLowerCase())).size).toBe(4);
          expect(question.correctIndex).toBeGreaterThanOrEqual(0);
          expect(question.correctIndex).toBeLessThan(4);
        }
      }
    }
  });

  it("puts the correct answer in every position over many quizzes (no positional bias)", () => {
    const positions = new Set<number>();
    for (const question of buildQuiz(realWords, 20, mathRandomRng)) positions.add(question.correctIndex);
    for (const question of buildQuiz(realWords, 20, mathRandomRng)) positions.add(question.correctIndex);
    expect(positions.size).toBe(4);
  });

  it("refuses to build a quiz larger than the word list", () => {
    expect(() => buildQuiz([word(1, "A"), word(2, "B")], 5, seededRng(1))).toThrow(/Not enough words/);
  });
});

describe("shuffle and scoring", () => {
  it("shuffles without losing items", () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(3)).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("scores only matching answers", () => {
    expect(
      scoreAnswers([
        { correctIndex: 1, chosenIndex: 1 },
        { correctIndex: 2, chosenIndex: 0 },
        { correctIndex: 3, chosenIndex: null },
      ]),
    ).toBe(1);
  });
});
