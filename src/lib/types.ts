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

export type ProgressState = {
  lastUpdated: string;
  learnedWordIds: number[];
  quizHistory: Array<{ ts: string; score: number; total: number }>;
  activeQuiz?: {
    questionIndex: number;
    answers: number[];
    questionIds: string[];
  };
  preferences: {
    questionsPerQuiz: QuizLength;
  };
};

export type GeneratedVocabData = {
  entries: VocabEntry[];
  warnings: ParseWarning[];
  stats: ParseResult["stats"];
  generatedAt: string;
};
