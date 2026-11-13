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
npm run dev            # next dev (needs Postgres + seeded words)
npm run build          # next build (no database needed at build time)
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

**Full-stack app** — the migration in `plans/backend-architecture.md` (stages 0–5) is complete.
Postgres + Drizzle, vocabulary in the database, `/learn` reads words server-side,
parent accounts (Better Auth, email + password) with child profiles; every page except `/`,
`/sign-in`, `/sign-up` requires sign-in **and** an active child; **progress per child in
Postgres** (learned words by headword, quiz results, preferred quiz length); **the quiz runs on
the server** (questions built, stored, revealed and scored server-side; resume from the database).
Nothing about progress or quizzes is kept in the browser any more (only the theme preference).

### Operations
- **Logging:** `src/server/log.ts` → `log.info/warn/error(event, fields)` writes one JSON line per
  event (`{time, level, event, ...}`); keys that look sensitive (password, email, token, cookie…)
  are redacted, anything shaped like an email is masked, and Drizzle "Failed query" errors are
  reduced to "Database query failed" + driver code (their message contains the SQL parameters).
  Better Auth's own logger is routed through it (`src/server/auth.ts`). Log **ids, never personal data**. Event names are dotted, e.g. `quiz.finished`,
  `auth.sign_in.rejected`, `session.child_not_owned` (possible cookie tampering).
- **Rate limiting:** server actions call Better Auth directly, which **bypasses Better Auth's HTTP
  rate limiter**, so `src/app/actions/auth.ts` limits the form path itself via
  `src/server/rateLimit.ts` (Postgres `rate_limit` table, atomic upsert, shared by all instances):
  sign-in 10 / 15 min per account (email stored only as a SHA-256 hash) and 30 / 15 min per IP;
  sign-up 10 / hour per IP. A correct password resets the account counter. Fails closed. IP comes
  from `x-forwarded-for` — assumes a proxy in front; the per-account limit can't be forged.
- **Health check:** `GET /api/health` → 200 `{status:"ok",database:"ok"}` or 503 when the database
  is unreachable; `no-store`, reveals nothing else. Not behind sign-in.
- **Errors:** `src/app/error.tsx` (inside the layout, kid-friendly, shows `digest` as an error code),
  `global-error.tsx` (last resort; own `<html>`, shared fonts from `src/app/fonts.ts`),
  `not-found.tsx`. The root layout catches account-lookup failures so outages still render the
  normal shell.
- **Pre-accounts progress import:** browsers that used the old app have `eleven_plus_quiz_progress_v1`
  in localStorage. `LegacyImportBanner` (Home + Progress) offers a one-time import into the active
  learner: `parseLegacyProgress` (tolerant, `src/lib/legacyProgress.ts`) → `importLegacyProgressAction`
  (Zod `legacyProgressSchema`) → `importLegacyProgress` (`src/server/legacyImport.ts`; idempotent).
  Afterwards the key is renamed to `…_imported`; "No thanks" sets `eleven_plus_legacy_import_dismissed_v1`.

### Quiz
- Tables: `quiz_attempt` (status `in_progress` | `finished`; **at most one in progress per child**
  via a partial unique index; CHECK that finished ⇔ score + finished_at set) and `quiz_question`
  (PK attempt_id + position; prompt/options frozen as shown; `correct_index`, `chosen_index`).
- `src/lib/quiz.ts` (pure, unit-tested): `buildQuiz` picks distinct headwords; `buildQuestion`
  picks 3 distractors with **distinct headwords** (never the answer's — fixes duplicate "Serene"),
  same part of speech preferred; RNG injected (`crypto.randomInt` on the server).
- `src/server/quiz.ts`: `startQuiz` (replaces any unfinished round, saves preferred length),
  `getActiveQuiz`, `answerQuestion` (first answer is final; reveals `correctIndex`),
  `finishQuiz` (requires all answered; scores in a transaction; idempotent). Views never include
  `correctIndex` for unanswered questions. All scoped by the verified child id.
- Actions: `src/app/actions/quiz.ts`. `QuizMission` only renders what the server returns;
  resume lands on the first unanswered question.

### Progress
- Tables: `learned_word` (PK child_id + headword), `quiz_attempt` (see Quiz), `child.preferred_quiz_length`.
  All cascade-delete with the child.
- `src/server/progress.ts`: `getProgressSnapshot` (counts **finished** rounds only; `hasActiveQuiz`),
  `setWordLearned` (by word id → headword), `setPreferredQuizLength`, `resetProgress` (also clears an unfinished round). They take an **already-verified**
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
   Malformed entries are skipped and printed as warnings by the seed script. After editing the
   markdown, run `npm run db:seed` (there is no generated file to commit any more).

### Layout

```
src/app/            App Router pages (server components that call requireChild(), rendering client components)
  sign-in/, sign-up/, profiles/   account screens (built from existing CSS classes)
  actions/          server actions: auth.ts, profiles.ts, progress.ts, quiz.ts, legacyImport.ts
  api/auth/[...all] Better Auth handler
  api/health        health check (200 / 503)
  error.tsx, global-error.tsx, not-found.tsx, fonts.ts
  layout.tsx        fonts (Baloo 2 / Nunito), inline theme-init script, ThemeProvider, header/footer
  page.tsx          server: active child's snapshot → <HomeDashboard> (stats + mission links)
  learn/page.tsx    server: words + snapshot → <LearnDeck> (client: group picker, search, WordCards)
  quiz/page.tsx     server: active round + preferred length → <QuizMission activeQuiz initialQuizLength>
  progress/page.tsx server: snapshot → <ProgressDashboard>
src/components/     HomeDashboard, LearnDeck, QuizMission, ProgressDashboard, AuthForm, AddChildForm, HeaderNav (+ account chips),
                    LegacyImportBanner, WordCard, QuizCard, ThemeProvider, ThemeToggle
src/server/         server code: db/ (schema, client, seedVocab), auth.ts, session.ts, children.ts, progress.ts, quiz.ts,
                    vocab.ts, legacyImport.ts, log.ts, rateLimit.ts
src/middleware.ts   redirects signed-out visitors away from /learn, /quiz, /progress, /profiles
drizzle/            generated SQL migrations (committed)
src/hooks/          useMounted, useTheme
src/lib/
  types.ts          VocabEntry, WordEntry, QuizLength (5|10|20), QuizView, ProgressSnapshot, ...
  quiz.ts           pure quiz builder: buildQuiz, buildQuestion, scoreAnswers, shuffle (injectable RNG)
  difficulty.ts     hand-curated easy/hard ID sets (seed source for word.difficulty); else medium
  vocabSeed.ts      pure markdown→rows transform (headword, difficulty)
  validation.ts     Zod schemas (auth, child name, quiz, legacy import), safeNextPath / learnerNextPath
                    (reject control chars + backslashes, then require same origin via URL parsing)
  wordCounts.ts     count distinct words (headwords) — used for every count on the Learn page
  legacyProgress.ts tolerant reader for the pre-accounts localStorage blob
  theme.ts          light/dark resolution + persistence
  parseVocabMarkdown.ts  the markdown parser (used by db:seed)
tests/              unit tests; tests/db/ = Postgres integration tests (npm run test:db)
plans/              past implementation plans (historical; may reference old counts)
```

### Key behaviours

- **Quiz:** "meaning → word" only. Prompt = meaning; 4 options = answer + 3 distractors with distinct headwords (same part of speech preferred), shuffled once on the server and stored. See "Quiz" above.
- **Progress** lives in Postgres per child (see "Progress" above).
- **Theme** stored under `eleven_plus_theme_v1`; the inline script in `layout.tsx` duplicates the resolution logic in `theme.ts` (to avoid a flash) — keep both in sync.
- **Difficulty:** stored in `word.difficulty`, seeded from the `easyIds` / `hardIds` sets in `src/lib/difficulty.ts` (244 easy / 381 medium / 335 hard). When adding new sets, classify the new IDs there and re-seed.
- **Duplicates:** 960 entries but 878 distinct words (`headword`); 78 words appear in two sets.

## Known issues / tech debt

- Duplicated theme-init logic (inline script in `layout.tsx` vs `theme.ts`).
- `plans/steady-dreaming-hedgehog.md` references 560 words; the dataset is now 960.
- Open from review 2 (worth knowing): the 6-learner cap can be exceeded by simultaneous requests
  (count-then-insert, no lock); the legacy import action can be called repeatedly to add fake
  finished rounds (one-time only in the browser); the root layout's try/catch swallows Next's
  dynamic-rendering signal (7 false `layout.account_lookup_failed` logs per build — use
  `unstable_rethrow`); Home's "Resume saved quiz mission" lands on setup; "Sign in to track
  progress" shows to a signed-in parent with no learner; raw `/api/auth/sign-up/email` accepts
  blank/very long names; plan doc overstates (parent overview, rename, sign-up CTAs).
- **Before a public launch:** email verification + password reset (need an email provider), and a
  privacy notice (children's data; UK GDPR / Age Appropriate Design Code). Not built yet.
- Fixed after review 2: sign-in form had no rate limit; `next` redirect check let tab/newline/backslash
  through; Learn group counts double-counted repeated words; emails could reach logs via DB errors.
- Fixed in stage 5: no error pages (blank Next.js error screen); no way to see failures (no logs);
  duplicated markdown parser and the bundled JSON copy of the word list.
- Fixed in stage 4: resuming a quiz could change saved answers; "Serene" offered twice; scores computed (and fakeable) in the browser; "Resume" button shown with nothing to resume.
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
