# WordSpark 11+ Vocabulary App

Kid-friendly web app for UK 11+ exam vocabulary practice, built with Next.js, TypeScript and Postgres.

## Features

- **Family accounts:** a parent or carer signs in (email + password) and adds up to 6 child profiles. Children don't need an email.
- **Learn:** words grouped into Easy / Medium / Hard, with search, reveal-all and "mark learned".
- **Quiz:** multiple-choice "meaning → word" rounds of 5, 10 or 20 questions, built and scored on the server. An unfinished round can be resumed on any device, exactly as it was left.
- **Progress:** learned words, quiz history and best score per child, saved to the family account so it follows them across devices.
- **One-time import** of progress saved in a browser by the earlier, pre-accounts version of the app.
- Light and dark themes; works on phones.

## Data source

- `Y5_set01_to_48.md`: 48 sets × 20 words = 960 entries (878 distinct words; some appear in two sets).
- Loaded into Postgres with `npm run db:seed` (idempotent; malformed entries are skipped with warnings).

## Getting started

```bash
npm ci
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d     # local Postgres (data kept in a Docker volume)
npm run db:setup         # create tables and load the 960 words
npm run dev
```

## Scripts

- `npm run dev` / `npm run build` / `npm start`: Next.js dev server, production build, production server
- `npm run test`: unit tests (no database needed)
- `npm run test:db`: integration tests against `TEST_DATABASE_URL` (wipes that database)
- `npm run typecheck` / `npm run lint`
- `npm run db:migrate` / `db:seed` / `db:setup`: apply migrations / load words / both
- `npm run db:generate`: create a migration after changing `src/server/db/schema.ts` (read the SQL before applying)

## Architecture

- **Next.js App Router:** server components load data; existing client components render it unchanged.
- **Postgres + Drizzle ORM:** schema in `src/server/db/schema.ts`, migrations in `drizzle/`.
- **Better Auth** for parent accounts. Every request re-checks that the active child belongs to the signed-in parent.
- **Server actions** (validated with Zod) for every change: learned words, quiz answers, profiles.
- **Operations:** structured JSON logs (no personal data), `GET /api/health` (200, or 503 if the database is unreachable), friendly error and not-found pages.

See `CLAUDE.md` for details and `plans/backend-architecture.md` for how the app moved from browser-only to full-stack.

## Before a public launch

- Email verification and password reset (needs an email provider).
- A privacy notice: the app stores children's learning data.
