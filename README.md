# WordSpark 11+ Vocabulary App

Kid-friendly web app for UK 11+ exam vocabulary practice, built with Next.js + TypeScript.

## Features

- Learn mode with searchable vocabulary cards
- Quiz mode (multiple-choice meanings -> words)
- Progress saved in browser localStorage (as of now in this MVP)
- Resume unfinished quiz
- Build-time markdown parsing into normalized JSON (as of now in this MVP)
- Tolerant import: malformed blocks are skipped with warnings

## Data Source

- Source markdown: `Y5_set01_to_24.md`
- Generated artifact: `src/data/vocab.generated.json`

## Scripts

- `npm run dev` -> regenerates vocab JSON, then starts Next dev server
- `npm run build` -> regenerates vocab JSON, then builds app
- `npm run test` -> runs Vitest tests
