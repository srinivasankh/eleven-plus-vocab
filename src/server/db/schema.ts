import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);

/** One of the 48 sets of 20 words in Y5_set01_to_48.md. */
export const vocabSets = pgTable("vocab_set", {
  number: integer("number").primaryKey(),
});

/**
 * A vocabulary entry. `id` is the global id from the source markdown (1..960), so it is
 * stable across re-seeds. `headword` is the lower-cased word: some words appear in more than
 * one set, and progress is tracked per headword so they only count once.
 */
export const words = pgTable(
  "word",
  {
    id: integer("id").primaryKey(),
    setNumber: integer("set_number")
      .notNull()
      .references(() => vocabSets.number, { onDelete: "restrict" }),
    word: text("word").notNull(),
    headword: text("headword").notNull(),
    type: text("type").notNull(),
    meaning: text("meaning").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    synonyms: text("synonyms").array().notNull(),
    antonyms: text("antonyms").array().notNull(),
    examples: text("examples").array().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("word_difficulty_idx").on(table.difficulty),
    index("word_headword_idx").on(table.headword),
    index("word_set_number_idx").on(table.setNumber),
  ],
);

export type WordRow = typeof words.$inferSelect;
export type NewWordRow = typeof words.$inferInsert;
