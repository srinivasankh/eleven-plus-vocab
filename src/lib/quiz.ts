import { QuizLength } from "@/lib/types";

/** The fields of a word the quiz needs. */
export type QuizWord = {
  id: number;
  word: string;
  headword: string;
  type: string;
  meaning: string;
};

/** A question as stored by the server. */
export type BuiltQuestion = {
  wordId: number;
  prompt: string;
  options: string[];
  correctIndex: number;
};

/** Returns an integer in [0, maxExclusive). Injected so tests can be deterministic. */
export type Rng = (maxExclusive: number) => number;

export const mathRandomRng: Rng = (maxExclusive) => Math.floor(Math.random() * maxExclusive);

export const OPTIONS_PER_QUESTION = 4;

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = rng(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Up to `count` words from `candidates` with distinct headwords, none equal to `exclude`. */
function pickDistinct(candidates: readonly QuizWord[], count: number, exclude: Set<string>, rng: Rng): QuizWord[] {
  const picked: QuizWord[] = [];
  const seen = new Set(exclude);
  for (const candidate of shuffle(candidates, rng)) {
    if (picked.length === count) break;
    if (seen.has(candidate.headword)) continue;
    seen.add(candidate.headword);
    picked.push(candidate);
  }
  return picked;
}

/**
 * Builds one "meaning → word" question. Wrong options are other words (never the same word
 * spelled the same, e.g. "Serene" #42 vs #839), preferring the same part of speech.
 */
export function buildQuestion(answer: QuizWord, pool: readonly QuizWord[], rng: Rng): BuiltQuestion {
  const others = pool.filter((item) => item.headword !== answer.headword);
  const sameType = others.filter((item) => item.type.toLowerCase() === answer.type.toLowerCase());
  const wanted = OPTIONS_PER_QUESTION - 1;

  const exclude = new Set([answer.headword]);
  let distractors = pickDistinct(sameType, wanted, exclude, rng);
  if (distractors.length < wanted) {
    for (const item of distractors) exclude.add(item.headword);
    distractors = [...distractors, ...pickDistinct(others, wanted - distractors.length, exclude, rng)];
  }

  const options = shuffle([answer.word, ...distractors.map((item) => item.word)], rng);
  return {
    wordId: answer.id,
    prompt: answer.meaning,
    options,
    correctIndex: options.indexOf(answer.word),
  };
}

/** Picks `length` different words (distinct headwords) and builds a question for each. */
export function buildQuiz(pool: readonly QuizWord[], length: QuizLength, rng: Rng): BuiltQuestion[] {
  const answers = pickDistinct(pool, length, new Set(), rng);
  if (answers.length < length) {
    throw new Error(`Not enough words for a ${length}-question quiz.`);
  }
  return answers.map((answer) => buildQuestion(answer, pool, rng));
}

export function scoreAnswers(questions: readonly { correctIndex: number; chosenIndex: number | null }[]): number {
  return questions.filter((question) => question.chosenIndex === question.correctIndex).length;
}
