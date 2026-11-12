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
cp .env.example .env   # first time only (DATABASE_URL, TEST_DATABASE_URL, BETTER_AUTH_*)
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
(`.env.example`'s `BETTER_AUTH_SECRET` is a placeholder; replace it with `openssl rand -base64 32`.)
The database is disposable (it disappears with the container); migrations + seed rebuild it.

## Architecture

**Mid-migration to a full-stack app** — see `plans/backend-architecture.md` (stages 0–5).
Done: Postgres + Drizzle, vocabulary in the database, `/learn` reads words server-side,
parent accounts (Better Auth, email + password) with child profiles; every page except `/`,
`/sign-in`, `/sign-up` requires sign-in **and** an active child; **progress per child in
Postgres** (learned words by headword, quiz results, preferred quiz length).
Not yet (stage 4): the quiz itself. Until then:
- `/quiz` still builds questions in the browser from the bundled `src/data/vocab.generated.json`
  and computes the score client-side; `recordQuizResultAction` only checks it is plausible.
- A half-finished quiz lives in `localStorage` under `eleven_plus_active_quiz_v1:<childId>`
  (`src/lib/storage.ts`, `useActiveQuiz`), wrapped so blocked storage can't crash the app.
  The pre-accounts blob `eleven_plus_quiz_progress_v1` is no longer read or written (stage 5 may import it).

### Progress
- Tables: `learned_word` (PK child_id + headword), `quiz_attempt` (finished rounds; CHECK
  total ∈ {5,10,20}, 0 ≤ score ≤ total), `child.preferred_quiz_length`. All cascade-delete with the child.
- `src/server/progress.ts`: `getProgressSnapshot`, `setWordLearned` (by word id → headword),
  `recordQuizResult`, `setPreferredQuizLength`, `resetProgress`. They take an **already-verified**
  child id; server actions in `src/app/actions/progress.ts` get it from `requireChild()`, never from the client.
- Pages load a `ProgressSnapshot` on the server and pass it as props. Client updates are
  optimistic (update UI, call action, roll back + show `.form-error` on failure).
- Mastery totals count distinct words (878), "best score" = best percentage.
- Dates from the server are formatted after mount (`useMounted`) so they use the viewer's time zone.

### Accounts & access control
- `user`/`session`/`account`/`verification` = Better Auth tables (a `user` is a **parent**);
  `child` = profiles owned by a parent (display name only — no child PII), max 6 per family.
- `src/server/auth.ts` → `getAuth()` (lazy). HTTP endpoints at `/api/auth/*`.
- `src/server/session.ts`: `getParent()`, `getActiveChild()`, `requireParent(next)`,
  `requireChild(next)`. The active child id lives in the httpOnly `ws_child` cookie and is
  **re-checked against `child.parent_id` on every request** (`getChildForParent`). Any new
  page/action that touches a child's data must call `requireChild()` (or `requireParent()` and
  check ownership) — `src/middleware.ts` only checks that a session cookie exists.
- Signing in clears `ws_child`, so a returning parent always picks a learner
  (`/profiles?next=…`). Redirect targets go through `safeNextPath` / `learnerNextPath`
  (`src/lib/validation.ts`) — never redirect to a raw query value.
- Forms: server actions in `src/app/actions/` + `useActionState`, inputs validated with Zod.

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
src/app/            App Router pages (server components that call requireChild(), rendering client components)
  sign-in/, sign-up/, profiles/   account screens (built from existing CSS classes)
  actions/          server actions: auth.ts (sign up/in/out), profiles.ts (add/select child), progress.ts
  api/auth/[...all] Better Auth handler
  layout.tsx        fonts (Baloo 2 / Nunito), inline theme-init script, ThemeProvider, header/footer
  page.tsx          server: active child's snapshot → <HomeDashboard> (stats + mission links)
  learn/page.tsx    server: words + snapshot → <LearnDeck> (client: group picker, search, WordCards)
  quiz/page.tsx     server: requireChild() → <QuizMission childId initialQuizLength>
  progress/page.tsx server: snapshot → <ProgressDashboard>
src/components/     HomeDashboard, LearnDeck, QuizMission, ProgressDashboard, AuthForm, AddChildForm, HeaderNav (+ account chips),
                    WordCard, QuizCard, ThemeProvider, ThemeToggle, DataWarningFooter
src/server/         server-only code: db/ (schema, client, seedVocab), auth.ts, session.ts, children.ts, progress.ts, vocab.ts
src/middleware.ts   redirects signed-out visitors away from /learn, /quiz, /progress, /profiles
drizzle/            generated SQL migrations (committed)
src/hooks/          useActiveQuiz (per-child unfinished quiz in localStorage), useMounted, useTheme
src/lib/
  types.ts          VocabEntry, WordEntry, QuizQuestion, QuizLength (5|10|20), ProgressSnapshot, ...
  quiz.ts           generateQuizQuestions, questionForEntry, scoreQuiz
  storage.ts        per-child active quiz in localStorage (safe against blocked storage)
  difficulty.ts     hand-curated easy/hard ID sets (seed source for word.difficulty); else medium
  vocabSeed.ts      pure markdown→rows transform (headword, difficulty)
  validation.ts     Zod schemas (sign-in/up, child name), safeNextPath / learnerNextPath
  theme.ts          light/dark resolution + persistence
  parseVocabMarkdown.ts  TS parser (tests only, see above)
tests/              unit tests; tests/db/ = Postgres integration tests (npm run test:db)
plans/              past implementation plans (historical; may reference old counts)
```

### Key behaviours

- **Quiz:** question type is `meaning_to_word` only. Prompt = meaning; 4 options = correct word + 3 distractors (same part of speech when ≥3 available, chosen deterministically from the entry id), then shuffled randomly. Question id format: `q-<vocabId>`.
- **Progress** lives in Postgres per child (see "Progress" above). Only the unfinished quiz is in `localStorage`; always load it through `sanitizeActiveQuiz` / `loadActiveQuiz`.
- **Theme** stored under `eleven_plus_theme_v1`; the inline script in `layout.tsx` duplicates the resolution logic in `theme.ts` (to avoid a flash) — keep both in sync.
- **Difficulty:** stored in `word.difficulty`, seeded from the `easyIds` / `hardIds` sets in `src/lib/difficulty.ts` (244 easy / 381 medium / 335 hard). When adding new sets, classify the new IDs there and re-seed.
- **Duplicates:** 960 entries but 878 distinct words (`headword`); 78 words appear in two sets.

## Known issues / tech debt

- **Quiz resume bug:** `activeQuiz.answers` stores option *indices*, but resume rebuilds questions via `questionForEntry`, which reshuffles options — saved answers can map to different words.
- Quiz scores are still computed in the browser (plausibility-checked on save) — moves server-side in stage 4.
- Quiz question for #839 "Serene" offers "Serene" twice (distractors excluded by id, not headword) — fixed by design in stage 4.
- Duplicated parser (script vs `src/lib`), duplicated theme-init logic (layout vs `theme.ts`).
- `plans/steady-dreaming-hedgehog.md` references 560 words; the dataset is now 960.
- Fixed in stage 3: blocked browser storage crashed every page; "best score" compared raw counts across quiz lengths; mastery counted duplicate words twice.
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
