import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

// ---------------------------------------------------------------------------
// Accounts (Better Auth). A `user` is a parent; field set matches better-auth's core schema.
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Child profiles. Owned by a parent; only a display name is stored (no child PII).
// ---------------------------------------------------------------------------

export const child = pgTable(
  "child",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    parentId: text("parent_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    /** Last quiz length the child picked (5, 10 or 20). */
    preferredQuizLength: integer("preferred_quiz_length").notNull().default(10),
    /** When pre-accounts browser progress was imported; the import is allowed once per child. */
    legacyImportedAt: timestamp("legacy_imported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("child_parent_id_idx").on(table.parentId),
    check("child_preferred_quiz_length_check", sql`${table.preferredQuizLength} in (5, 10, 20)`),
  ],
);

// ---------------------------------------------------------------------------
// Progress, per child.
// ---------------------------------------------------------------------------

/**
 * Words a child has marked as learned. Keyed by headword, not word id, so a word that appears
 * in two sets (e.g. "Serene" #42 and #839) is learned once and counts once.
 */
export const learnedWord = pgTable(
  "learned_word",
  {
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    headword: text("headword").notNull(),
    learnedAt: timestamp("learned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.headword] })],
);

export const quizStatusEnum = pgEnum("quiz_status", ["in_progress", "finished"]);

/**
 * One quiz round. The server builds the questions, stores them, and scores the round —
 * the browser never decides what is correct. A child has at most one round in progress.
 */
export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    childId: uuid("child_id")
      .notNull()
      .references(() => child.id, { onDelete: "cascade" }),
    status: quizStatusEnum("status").notNull().default("in_progress"),
    total: integer("total").notNull(),
    /** Null until the round is finished. */
    score: integer("score"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("quiz_attempt_child_finished_idx").on(table.childId, table.finishedAt),
    uniqueIndex("quiz_attempt_one_in_progress_idx")
      .on(table.childId)
      .where(sql`${table.status} = 'in_progress'`),
    check("quiz_attempt_total_check", sql`${table.total} in (5, 10, 20)`),
    check("quiz_attempt_score_check", sql`${table.score} is null or ${table.score} between 0 and ${table.total}`),
    check(
      "quiz_attempt_finished_check",
      sql`(${table.status} = 'finished') = (${table.score} is not null and ${table.finishedAt} is not null)`,
    ),
  ],
);

/**
 * A question within a round, frozen as it was shown: prompt and options are copied so the
 * review stays correct even if the word list is edited later.
 */
export const quizQuestion = pgTable(
  "quiz_question",
  {
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempt.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    wordId: integer("word_id").references(() => words.id, { onDelete: "set null" }),
    prompt: text("prompt").notNull(),
    options: text("options").array().notNull(),
    correctIndex: integer("correct_index").notNull(),
    /** Null until answered. */
    chosenIndex: integer("chosen_index"),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.attemptId, table.position] }),
    check("quiz_question_correct_index_check", sql`${table.correctIndex} between 0 and cardinality(${table.options}) - 1`),
    check(
      "quiz_question_chosen_index_check",
      sql`${table.chosenIndex} is null or ${table.chosenIndex} between 0 and cardinality(${table.options}) - 1`,
    ),
  ],
);

export type ChildRow = typeof child.$inferSelect;
export type WordRow = typeof words.$inferSelect;
export type NewWordRow = typeof words.$inferInsert;

// ---------------------------------------------------------------------------
// Rate limiting (sign-in / sign-up), shared by every server instance.
// `key` never contains an email: emails are stored as a SHA-256 hash.
// ---------------------------------------------------------------------------

export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

