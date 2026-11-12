# CLAUDE.md

Guidance for working on **WordSpark** — a kid-friendly UK 11+ vocabulary practice web app.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript (strict) · plain CSS (`src/app/globals.css`, no UI/CSS framework)
- Vitest 4 + jsdom for tests; ESLint via `next/core-web-vitals`
- Path alias: `@/*` → `src/*` (configured in both `tsconfig.json` and `vitest.config.ts`)
- ESM project (`"type": "module"`)

## Commands

```bash
npm ci              # install
npm run dev         # regenerates vocab JSON (predev), then next dev
npm run build       # regenerates vocab JSON (prebuild), then next build
npm run test        # vitest run
npm run lint        # next lint
npx tsc --noEmit    # typecheck
node scripts/generate-vocab-json.mjs   # regenerate vocab JSON manually
```

Before committing: `npm run test` and `npx tsc --noEmit` should pass.

## Architecture

**There is no backend.** The app is fully client-side:
- Vocabulary is static data bundled at build time.
- User progress lives only in browser `localStorage` (per device/browser, no accounts, no sync).

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
2. **Generator:** `scripts/generate-vocab-json.mjs` parses the markdown → `src/data/vocab.generated.json` (`{ entries, warnings, stats, generatedAt }`). Entries missing word/type/meaning/synonyms/examples are skipped with a warning; gaps in the ID sequence are warned.
3. **Generated JSON is committed.** After editing the markdown, regenerate and commit the JSON too.
4. **Access:** `src/lib/vocabData.ts` (`getVocabEntries`, `getDataWarningsCount`, `getDataStats`). In non-production, `DataWarningFooter` shows a warning count.

⚠️ Parsing logic is **duplicated**: `scripts/generate-vocab-json.mjs` (used at build) and `src/lib/parseVocabMarkdown.ts` (used only by tests). Keep them in sync when changing the format.

### Layout

```
src/app/            App Router pages (all "use client")
  layout.tsx        fonts (Baloo 2 / Nunito), inline theme-init script, ThemeProvider, header/footer
  page.tsx          home: stats + mission links
  learn/page.tsx    difficulty group picker → searchable WordCard grid, mark learned
  quiz/page.tsx     quiz setup (5/10/20), play, resume, results + review table
  progress/page.tsx mastery dashboard, history, reset
src/components/     HeaderNav, WordCard, QuizCard, ThemeProvider, ThemeToggle, DataWarningFooter
src/hooks/          useProgressState (load on mount, save on every change), useTheme
src/lib/
  types.ts          VocabEntry, QuizQuestion, ProgressState, QuizLength (5|10|20), ...
  quiz.ts           generateQuizQuestions, questionForEntry, scoreQuiz
  storage.ts        localStorage persistence + sanitizeProgressState
  difficulty.ts     hand-curated easy/hard ID sets; everything else = medium
  theme.ts          light/dark resolution + persistence
  parseVocabMarkdown.ts  TS parser (tests only, see above)
tests/              parser, quiz, storage, theme, themeProvider
plans/              past implementation plans (historical; may reference old counts)
```

### Key behaviours

- **Quiz:** question type is `meaning_to_word` only. Prompt = meaning; 4 options = correct word + 3 distractors (same part of speech when ≥3 available, chosen deterministically from the entry id), then shuffled randomly. Question id format: `q-<vocabId>`.
- **Progress (`ProgressState`)** stored under key `eleven_plus_quiz_progress_v1`: `learnedWordIds`, `quizHistory[{ts,score,total}]`, optional `activeQuiz {questionIndex, answers, questionIds}`, `preferences.questionsPerQuiz`. Always pass loaded data through `sanitizeProgressState`. Changing the shape → bump the key version or migrate.
- **Theme** stored under `eleven_plus_theme_v1`; the inline script in `layout.tsx` duplicates the resolution logic in `theme.ts` (to avoid a flash) — keep both in sync.
- **Difficulty:** `src/lib/difficulty.ts` holds explicit `easyIds` / `hardIds` sets by word id (current split: 244 easy / 381 medium / 335 hard). When adding new sets, classify the new IDs there.

## Known issues / tech debt

- **Quiz resume bug:** `activeQuiz.answers` stores option *indices*, but resume rebuilds questions via `questionForEntry`, which reshuffles options — saved answers can map to different words.
- `learn/page.tsx` builds `learnedIds` as a new `Set` every render, defeating the `filtered` `useMemo`.
- Duplicated parser (script vs `src/lib`), duplicated theme-init logic (layout vs `theme.ts`).
- `plans/steady-dreaming-hedgehog.md` references 560 words; the dataset is now 960.

## Conventions

- Audience is 10–12 year olds: keep UI copy encouraging, simple, UK English ("practising", "colour").
- UI vocabulary is "mission"/game-style (Quiz Missions, Learning Deck, Mastery Dashboard).
- Reuse existing CSS classes (`.panel`, `.cta`, `.chip-btn`, `.meta-pill`, `.mission-grid`) and theme CSS variables; support both light and dark themes; check mobile widths (no horizontal scroll).
- Pages are client components; guard `window`/`document`/`localStorage` access for SSR (`typeof window === "undefined"`).
- Add/extend Vitest tests in `tests/` for logic changes in `src/lib`.

## Git

- Active development branch: `claude/backend-exploration` (push work here; `main` is the default branch).
