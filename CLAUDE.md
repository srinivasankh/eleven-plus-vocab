# CLAUDE.md

Guidance for working on **WordSpark** — a kid-friendly UK 11+ vocabulary practice web app.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict) · plain CSS (`src/app/globals.css`, no UI/CSS framework)
- Postgres + Drizzle ORM (`postgres` driver) · Zod · `tsx` for TS scripts
- Vitest 4 + jsdom for unit tests; separate Vitest config for Postgres integration tests; ESLint via `next/core-web-vitals`
- Path alias: `@/*` → `src/*` (configured in both `tsconfig.json` and `vitest.config.ts`)
- ESM project (`"type": "module"`)

## Commands

```bash
npm ci                 # install
cp .env.example .env   # first time only (DATABASE_URL, TEST_DATABASE_URL)
docker compose up -d   # local Postgres (or use any Postgres; see below)
npm run db:setup       # db:migrate + db:seed (load the 960 words)
npm run dev            # regenerates vocab JSON (predev), then next dev
npm run build          # regenerates vocab JSON (prebuild), then next build
npm run test           # unit tests (no database needed)
npm run test:db        # integration tests against TEST_DATABASE_URL (wipes that DB)
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run db:generate    # after editing src/server/db/schema.ts → new SQL in drizzle/ (read it!)
npm run db:migrate     # apply migrations
npm run db:seed        # (re)load words from Y5_set01_to_48.md — idempotent
npm run db:studio      # browse the database
```

Before committing: `npm run test`, `npm run test:db` and `npm run typecheck` should pass.

**Cloud sessions (no Docker):** Postgres 16 is installed in the container but stopped. Start it and
create the role/databases once per session:
```bash
service postgresql start
su postgres -c "psql -c \"create role wordspark login password 'wordspark'\" -c 'create database wordspark owner wordspark' -c 'create database wordspark_test owner wordspark'"
cp .env.example .env && npm run db:setup
```
The database is disposable (it disappears with the container); migrations + seed rebuild it.

## Architecture

**Mid-migration to a full-stack app** — see `plans/backend-architecture.md` (stages 0–5).
Done: Postgres + Drizzle, vocabulary in the database, `/learn` reads words server-side.
Not yet: accounts (parent + child profiles), server-side progress and quiz. Until then:
- `/quiz` and `/progress` still read the bundled `src/data/vocab.generated.json`.
- User progress still lives only in browser `localStorage` (`useProgressState`).

Database rules:
- Schema lives in `src/server/db/schema.ts`. Change it → `npm run db:generate` → read the SQL in
  `drizzle/` → `npm run db:migrate`. **Never `drizzle-kit push`**, never edit an applied migration.
- Server code gets the client via `getDb()` from `src/server/db/index.ts` (lazy; `server-only`).
  Scripts/tests must not import that module — they build their own client (see `scripts/seed.ts`,
  `tests/db/helpers.ts`).
- Pages that query the DB must render on demand (`export const dynamic = "force-dynamic"`), so
  `next build` never needs a database.

### Data pipeline

1. **Source of truth:** `Y5_set01_to_48.md` — 48 sets × 20 words = 960 entries. Format per entry:
   ```md
   # Set N Vocabulary List
   ## <id>. <Word>
   **Type:** ...
   **Meaning:** ...
   **Synonyms:** a, b, c        (comma or slash separated)
   **Antonyms:** x, y           ("(no direct antonyms)" → empty list)
   **Example Sentences:**
   1. ...
   ```
   IDs are global and sequential (1–960), not per-set.
2. **Database:** `npm run db:seed` → `scripts/seed.ts` → `parseVocabMarkdown` → `buildSeedRows`
   (`src/lib/vocabSeed.ts`: adds `headword` + `difficulty`) → `seedVocab` (`src/server/db/seedVocab.ts`:
   upsert in one transaction, deletes words no longer in the source). Tables: `vocab_set`, `word`.
   Read via `getAllWords()` in `src/server/vocab.ts`.
3. **Legacy JSON (until stage 5):** `scripts/generate-vocab-json.mjs` parses the markdown → `src/data/vocab.generated.json` (`{ entries, warnings, stats, generatedAt }`). Entries missing word/type/meaning/synonyms/examples are skipped with a warning; gaps in the ID sequence are warned.
   The JSON is committed. After editing the markdown, re-seed **and** regenerate/commit the JSON.
   Access: `src/lib/vocabData.ts` (`getVocabEntries`, `getDataWarningsCount`, `getDataStats`). In non-production, `DataWarningFooter` shows a warning count.

⚠️ Parsing logic is **duplicated**: `scripts/generate-vocab-json.mjs` (legacy JSON) and `src/lib/parseVocabMarkdown.ts` (seed + tests). Keep them in sync until the JSON pipeline is removed.

### Layout

```
src/app/            App Router pages (/learn is a server component; the others are still "use client")
  layout.tsx        fonts (Baloo 2 / Nunito), inline theme-init script, ThemeProvider, header/footer
  page.tsx          home: stats + mission links
  learn/page.tsx    server: getAllWords() → <LearnDeck> (client: group picker, search, WordCards)
  quiz/page.tsx     quiz setup (5/10/20), play, resume, results + review table
  progress/page.tsx mastery dashboard, history, reset
src/components/     LearnDeck, HeaderNav, WordCard, QuizCard, ThemeProvider, ThemeToggle, DataWarningFooter
src/server/         server-only code: db/ (schema, client, seedVocab), vocab.ts (queries)
drizzle/            generated SQL migrations (committed)
src/hooks/          useProgressState (load on mount, save on every change), useTheme
src/lib/
  types.ts          VocabEntry, QuizQuestion, ProgressState, QuizLength (5|10|20), ...
  quiz.ts           generateQuizQuestions, questionForEntry, scoreQuiz
  storage.ts        localStorage persistence + sanitizeProgressState
  difficulty.ts     hand-curated easy/hard ID sets (seed source for word.difficulty); else medium
  vocabSeed.ts      pure markdown→rows transform (headword, difficulty)
  theme.ts          light/dark resolution + persistence
  parseVocabMarkdown.ts  TS parser (tests only, see above)
tests/              unit tests; tests/db/ = Postgres integration tests (npm run test:db)
plans/              past implementation plans (historical; may reference old counts)
```

### Key behaviours

- **Quiz:** question type is `meaning_to_word` only. Prompt = meaning; 4 options = correct word + 3 distractors (same part of speech when ≥3 available, chosen deterministically from the entry id), then shuffled randomly. Question id format: `q-<vocabId>`.
- **Progress (`ProgressState`)** stored under key `eleven_plus_quiz_progress_v1`: `learnedWordIds`, `quizHistory[{ts,score,total}]`, optional `activeQuiz {questionIndex, answers, questionIds}`, `preferences.questionsPerQuiz`. Always pass loaded data through `sanitizeProgressState`. Changing the shape → bump the key version or migrate.
- **Theme** stored under `eleven_plus_theme_v1`; the inline script in `layout.tsx` duplicates the resolution logic in `theme.ts` (to avoid a flash) — keep both in sync.
- **Difficulty:** stored in `word.difficulty`, seeded from the `easyIds` / `hardIds` sets in `src/lib/difficulty.ts` (244 easy / 381 medium / 335 hard). When adding new sets, classify the new IDs there and re-seed.
- **Duplicates:** 960 entries but 878 distinct words (`headword`); 78 words appear in two sets.

## Known issues / tech debt

- **Quiz resume bug:** `activeQuiz.answers` stores option *indices*, but resume rebuilds questions via `questionForEntry`, which reshuffles options — saved answers can map to different words.
- `saveProgressState` doesn't catch storage errors → the whole app crashes when the browser blocks storage (goes away when progress moves server-side in stage 3).
- Quiz question for #839 "Serene" offers "Serene" twice (distractors excluded by id, not headword) — fixed by design in stage 4.
- Duplicated parser (script vs `src/lib`), duplicated theme-init logic (layout vs `theme.ts`).
- `plans/steady-dreaming-hedgehog.md` references 560 words; the dataset is now 960.
- Fixed: the parsers used to assign 929 of 960 words to set 48 (line number computed from a character offset). Regression-tested in `tests/parser.test.ts`.

## Conventions

- Audience is 10–12 year olds: keep UI copy encouraging, simple, UK English ("practising", "colour").
- UI vocabulary is "mission"/game-style (Quiz Missions, Learning Deck, Mastery Dashboard).
- Reuse existing CSS classes (`.panel`, `.cta`, `.chip-btn`, `.meta-pill`, `.mission-grid`) and theme CSS variables; support both light and dark themes; check mobile widths (no horizontal scroll).
- Keep the look: new data plumbing must not change markup or CSS. Data fetching goes in a server `page.tsx`; existing UI moves into a client component unchanged (pattern: `learn/page.tsx` → `LearnDeck`).
- Client components guard `window`/`document`/`localStorage` access for SSR (`typeof window === "undefined"`).
- Validate server action inputs with Zod.
- Add/extend Vitest tests in `tests/` for logic changes in `src/lib`, and `tests/db/` for database code.

## Git

- Active development branch: `claude/backend-exploration` (push work here; `main` is the default branch).
