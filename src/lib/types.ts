export type VocabEntry = {
  id: number;
  setNumber: number | null;
  word: string;
  type: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
};

export type Difficulty = "easy" | "medium" | "hard";

/** A vocabulary entry as stored in the database: a parsed entry plus derived fields. */
export type WordEntry = VocabEntry & {
  /** Lower-cased word; words that appear in more than one set share a headword. */
  headword: string;
  difficulty: Difficulty;
};

export type ParseWarning = {
  line?: number;
  reason: string;
  entryId?: number;
};

export type ParseResult = {
  entries: VocabEntry[];
  warnings: ParseWarning[];
  stats: {
    totalBlocks: number;
    valid: number;
    invalid: number;
  };
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  questionType: "meaning_to_word";
  options: string[];
  correctOptionIndex: number;
  vocabId: number;
};

export type QuizLength = 5 | 10 | 20;

export type GeneratedVocabData = {
  entries: VocabEntry[];
  warnings: ParseWarning[];
  stats: ParseResult["stats"];
  generatedAt: string;
};

export type QuizResult = { ts: string; score: number; total: number };

/** A child's progress as the pages need it (from the database). */
export type ProgressSnapshot = {
  /** Headwords the child has marked learned. */
  learnedHeadwords: string[];
  /** Distinct words in the word list (duplicates across sets count once). */
  totalWords: number;
  attempts: number;
  /** Most recent first, at most 8. */
  recentResults: QuizResult[];
  /** Highest percentage so far (ties → most recent). */
  best: QuizResult | null;
  preferredQuizLength: QuizLength;
};

