# Plan: Backend re-architecture (keep the current look and UX)

Status: complete (stages 0–5 done) · Branch: `claude/backend-exploration`

## Goal

Move WordSpark from a browser-only app to a proper full-stack app — database, accounts,
server-side quiz logic — **without changing the look, feel or user experience**.
`globals.css`, the existing components (`WordCard`, `QuizCard`, `HeaderNav`, `ThemeToggle`)
and every page layout are kept; only where pages get their data from changes. New screens
(sign-in, child profiles) are built from the existing CSS classes (`.panel`, `.cta`,
`.chip-btn`, `.meta-pill`, `.mission-grid`, `.page-banner`).

## Decisions (agreed)

| Topic | Decision |
|---|---|
| Accounts | **Parent account + child profiles.** A parent signs up with email + password and adds one or more children. Each child's progress is separate; the parent sees each child's progress by switching learner (there is no combined parent overview yet). Children don't have emails or passwords. |
| Database | **Postgres from the start.** Local dev via `docker-compose.yml` (or a locally installed Postgres); hosted Postgres in production. |
| Guest mode | **None — sign-in required.** Only the home page (and sign-in / sign-up) is public. |

## Stack additions

- **Drizzle ORM** + `postgres` driver; migrations via `drizzle-kit generate` → review SQL → `drizzle-kit migrate` (never `push`).
- **Better Auth** (email + password) for parent accounts, using the Drizzle adapter.
- **Zod** to validate every server action input.
- Next.js **Server Components** fetch data; existing client components stay as interactive islands. Mutations go through **Server Actions**.

## Data model

```
user / session / account / verification   -- Better Auth tables (parents)

child          id, parent_id → user, display_name, created_at
               (minimal data: a display name only — no child PII)

vocab_set      id, number (1..48)
word           id (= markdown id 1..960), set_id → vocab_set, word, headword (lower-cased,
               trimmed — groups duplicate words), type, meaning, difficulty (easy|medium|hard),
               synonyms text[], antonyms text[], examples text[]

learned_word   child_id → child, headword, learned_at        PK (child_id, headword)
               -- tracked per *headword*, so the 78 words that appear twice count once

quiz_attempt   id, child_id → child, total (5|10|20), status (in_progress|finished),
               started_at, finished_at, score
quiz_question  attempt_id → quiz_attempt, position, word_id → word, prompt,
               options text[], correct_index, chosen_index (null until answered), answered_at

(As built, also: child.preferred_quiz_length, child.legacy_imported_at, rate_limit.)
```

Difficulty moves from the hard-coded ID lists in `src/lib/difficulty.ts` into the `word.difficulty`
column (seeded from those same lists, so the 244/381/335 split is preserved).

## Server layer (`src/server/`)

- `db/` — Drizzle client, schema, migrations.
- `auth.ts` — Better Auth config. `session.ts` — `requireParent()` / `requireChild()` helpers.
- `children.ts` — create/list profiles (renaming is not built); **active child** stored in an
  httpOnly cookie and re-checked against `parent_id` on every request (`requireChild()`), so one
  family can never read or write another's data.
- `vocab.ts` — queries for words by difficulty / search.
- `progress.ts` — mark/unmark learned, mastery counts, quiz history.
- `quiz.ts` — start, answer, finish, resume. **The server stores each question's option order
  and correct index**, scores answers itself, and the browser never decides correctness.
  This fixes, by design:
  - the resume bug (saved answers are tied to stored options, not re-shuffled ones),
  - the duplicate-"Serene" question (distractors are excluded by `headword`, not just id),
  - tamperable scores (scores are computed on the server).

## Pages

| Route | Access | Change |
|---|---|---|
| `/` | public | same hero and links; signed-out visitors following them are sent to sign-in (no separate sign-up CTA) |
| `/sign-in`, `/sign-up` | public | new, built from existing classes |
| `/profiles` | parent | new — pick / add a child ("Who's learning today?") |
| `/learn` | child | same UI; data from server, learned toggled via server action |
| `/quiz` | child | same UI; questions/answers/scoring via server actions; resume = load in-progress attempt |
| `/progress` | child | same UI; data from server; "best score" by percentage (one child at a time) |

Route protection in `middleware.ts` (cookie presence) **plus** `requireParent()` / `requireChild()`
in every server function (the real check).

## Operations

- `src/app/error.tsx` + `global-error.tsx` in the existing style (friendly "Something went wrong").
- Small structured logger for server actions and errors.
- `/api/health` — checks the database answers.
- `.env.example` documenting `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

## Phases (each: tests + typecheck pass, committed and pushed)

0. ✅ **Foundations** — Drizzle, Postgres (docker-compose + `.env.example`), scripts
   `db:generate` / `db:migrate` / `db:seed`, Zod. Upgrade `next` to the patched 15.x release.
1. ✅ **Vocabulary in the database** — schema + seed from `Y5_set01_to_48.md` (difficulty from
   current lists). Learn page reads words server-side. UI unchanged.
2. ✅ **Accounts & child profiles** — Better Auth, sign-in/up, `/profiles`, active-child cookie,
   route protection.
3. ✅ **Progress on the server** — learned words per child (by headword), Progress page from DB.
4. ✅ **Quiz on the server** — attempts/questions tables, start/answer/finish/resume actions.
5. ✅ **Hardening** — error pages, logging, health check, optional one-time import of a browser's
   old localStorage progress into a child profile, tests for ownership checks, update
   `README.md` and `CLAUDE.md`. Remove now-unused client-only code (`storage.ts`, generated JSON
   pipeline) once nothing reads it.

## Not in version one

- Email verification and password reset (need an email provider — add before public launch).
- Child PINs / child self sign-in, teacher/classroom accounts, Google sign-in.
- A parent overview of all children's progress on one page, and renaming learner profiles.
- Spaced repetition, streaks, XP (the UI labels that imply these stay as-is for now; flagged in review).
- Deployment (handled later with `deploy-an-app`).

## Before a public launch

Children's data is involved: a privacy notice (UK GDPR / Age Appropriate Design Code) is
required, and email verification + password reset should be in place.
