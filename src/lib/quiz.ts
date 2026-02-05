import { QuizLength, QuizQuestion, VocabEntry } from "@/lib/types";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function seededIndex(seed: number, size: number, offset: number): number {
  const value = (seed * 31 + offset * 17) % size;
  return value < 0 ? value + size : value;
}

export function questionForEntry(entry: VocabEntry, entries: VocabEntry[]): QuizQuestion {
  const pool = entries.filter((item) => item.id !== entry.id);
  const sameType = pool.filter((item) => item.type.toLowerCase() === entry.type.toLowerCase());
  const source = sameType.length >= 3 ? sameType : pool;

  const distractors = [0, 1, 2]
    .map((offset) => source[seededIndex(entry.id, source.length, offset)])
    .filter((item, idx, arr): item is VocabEntry => Boolean(item) && arr.findIndex((v) => v.id === item.id) === idx);

  const fallback = source.filter((item) => !distractors.some((picked) => picked.id === item.id)).slice(0, 3 - distractors.length);
  const allOptions = [entry.word, ...distractors.map((item) => item.word), ...fallback.map((item) => item.word)].slice(0, 4);
  const options = shuffle(allOptions);
  const correctOptionIndex = options.findIndex((option) => option === entry.word);

  return {
    id: `q-${entry.id}`,
    prompt: entry.meaning,
    questionType: "meaning_to_word",
    options,
    correctOptionIndex,
    vocabId: entry.id,
  };
}

export function generateQuizQuestions(
  entries: VocabEntry[],
  length: QuizLength,
): QuizQuestion[] {
  const sampled = shuffle(entries).slice(0, length);

  return sampled.map((entry) => questionForEntry(entry, entries));
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: number[],
): { score: number; total: number } {
  const score = questions.reduce((total, question, index) => {
    if (answers[index] === question.correctOptionIndex) {
      return total + 1;
    }
    return total;
  }, 0);

  return { score, total: questions.length };
}
