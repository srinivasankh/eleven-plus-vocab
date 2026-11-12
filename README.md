# WordSpark 11+ Vocabulary App

Kid-friendly web app for UK 11+ exam vocabulary practice, built with Next.js + TypeScript.

## Features

- Learn mode with searchable vocabulary cards
- Quiz mode (multiple-choice meanings -> words)
- Progress saved in browser localStorage (as of now in this MVP)
- Resume unfinished quiz
- Vocabulary stored in Postgres, seeded from the markdown source (`npm run db:seed`)
- Tolerant import: malformed blocks are skipped with warnings

## Data Source

- Source markdown: `Y5_set01_to_48.md` (48 sets x 20 words = 960 entries)
- Database: `vocab_set` and `word` tables (seeded); legacy generated JSON `src/data/vocab.generated.json` still used by Quiz/Progress

## Getting started

```bash
npm ci
cp .env.example .env
docker compose up -d     # local Postgres (data kept in a Docker volume)
npm run db:setup         # create tables and load the 960 words
npm run dev
```

## Scripts

- `npm run dev` -> regenerates vocab JSON, then starts Next dev server
- `npm run build` -> regenerates vocab JSON, then builds app
- `npm run test` -> unit tests (no database needed)
- `npm run test:db` -> integration tests against `TEST_DATABASE_URL` (wipes that database)
- `npm run typecheck` -> TypeScript check
- `npm run db:migrate` / `db:seed` / `db:setup` -> apply migrations / load words / both
- `npm run db:generate` -> create a migration after changing `src/server/db/schema.ts`

## Architecture

Being migrated from a browser-only app to a full-stack app (Postgres + Drizzle, then accounts
and server-side progress/quizzes) — see `plans/backend-architecture.md`. The vocabulary already
lives in Postgres and the Learn page reads it on the server.
