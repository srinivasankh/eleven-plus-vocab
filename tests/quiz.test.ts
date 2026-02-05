import { describe, expect, it } from "vitest";
import { generateQuizQuestions, scoreQuiz } from "@/lib/quiz";
import { VocabEntry } from "@/lib/types";

const entries: VocabEntry[] = [
  { id: 1, setNumber: 1, word: "Brisk", type: "Adjective", meaning: "quick", synonyms: ["fast"], antonyms: ["slow"], examples: ["A brisk walk."] },
  { id: 2, setNumber: 1, word: "Calm", type: "Adjective", meaning: "peaceful", synonyms: ["quiet"], antonyms: ["noisy"], examples: ["Calm sea."] },
  { id: 3, setNumber: 1, word: "Dwell", type: "Verb", meaning: "to live", synonyms: ["reside"], antonyms: ["leave"], examples: ["They dwell there."] },
  { id: 4, setNumber: 1, word: "Gleam", type: "Verb", meaning: "to shine", synonyms: ["glow"], antonyms: ["dim"], examples: ["Stars gleam."] },
  { id: 5, setNumber: 1, word: "Humble", type: "Adjective", meaning: "modest", synonyms: ["modest"], antonyms: ["proud"], examples: ["Stay humble."] },
  { id: 6, setNumber: 1, word: "Jovial", type: "Adjective", meaning: "cheerful", synonyms: ["merry"], antonyms: ["gloomy"], examples: ["A jovial host."] },
];

describe("quiz generation", () => {
  it("creates requested number of questions with 4 options", () => {
    const questions = generateQuizQuestions(entries, 5);
    expect(questions).toHaveLength(5);
    questions.forEach((question) => {
      expect(question.options.length).toBe(4);
      expect(question.correctOptionIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctOptionIndex).toBeLessThan(4);
      expect(new Set(question.options).size).toBe(4);
    });
  });

  it("scores answers correctly", () => {
    const questions = generateQuizQuestions(entries, 5);
    const answers = questions.map((question) => question.correctOptionIndex);
    const score = scoreQuiz(questions, answers);
    expect(score.score).toBe(score.total);
  });
});
