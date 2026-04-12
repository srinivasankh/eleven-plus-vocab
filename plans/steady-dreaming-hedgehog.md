# Plan: Group Words by Difficulty on Learn Page

## Context
The Learn page currently loads all 560 words at once (capped at 150 via `.slice(0, 150)`), which overwhelms students. The user wants words grouped into 3 difficulty tiers — **Easy**, **Medium**, **Hard** — based on real-world usage for 10–12 year olds. Students should first see the 3 group cards, then click one to see its words.

## Files to Modify

1. **`src/lib/difficulty.ts`** (new) — difficulty mapping + helpers
2. **`src/components/WordCard.tsx`** — accept optional `forceOpen` prop to support Reveal All / Hide All
3. **`src/app/learn/page.tsx`** — group selection UI, Reveal All / Hide All buttons
4. **`src/app/globals.css`** — styles for group cards and bulk action buttons

## Implementation

### Step 1: Create `src/lib/difficulty.ts`

- Export a `Difficulty` type: `"easy" | "medium" | "hard"`
- Export a `const difficultyMap: Record<number, Difficulty>` mapping each of the 560 word IDs to a difficulty tier based on word-frequency/familiarity for 10–12 year olds:
  - **Easy** (~190 words): everyday words kids this age know (e.g., Beautiful, Journey, Afraid, Popular, Science, Furniture)
  - **Medium** (~190 words): school-reading words not used daily (e.g., Reluctant, Spontaneous, Turbulent, Diminish, Notorious)
  - **Hard** (~180 words): advanced/rare words that stretch knowledge (e.g., Sacrosanct, Supercilious, Cantankerous, Amalgamate, Tenuous)
- Export helper: `getDifficulty(id: number): Difficulty` — returns the mapped difficulty, defaults to `"medium"` if missing
- Export helper: `filterByDifficulty(entries: VocabEntry[], difficulty: Difficulty): VocabEntry[]`

### Step 2: Modify `src/app/learn/page.tsx`

- Add state: `selectedGroup: Difficulty | null` (starts `null`)
- **When `selectedGroup` is null**: render 3 clickable group cards (reuse `.mission-grid` / `.panel` / `.mission-card` patterns from home page) showing:
  - Group name (Easy / Medium / Hard)
  - Word count in group
  - A brief encouraging description
  - Mastered count within that group
- **When a group is selected**: show a back button + existing search/word-grid UI, but filtered to that group's words only
- Add **"Reveal All" / "Hide All"** toggle buttons above the word grid that expand or collapse all word cards in the current group (controls the `open` state of every `WordCard` at once)
- Remove the `.slice(0, 150)` cap — each group will have ~180–190 words which is manageable
- Search bar and meta pills only visible when a group is selected
- Keep all existing functionality: search, learned toggle, progress state

### Step 3: Modify `src/components/WordCard.tsx`

- Add optional `forceOpen?: boolean` prop to `WordCard`
- When `forceOpen` is defined, it overrides the local `open` state (card is open if `forceOpen` is true)
- When `forceOpen` is undefined, the card works as before with its own toggle
- Individual "Reveal notes" / "Hide notes" button still works for per-card toggle when no bulk override is active

### Step 4: Add CSS in `globals.css`

- Add `.group-card` styles (cursor pointer, hover effect) — build on existing `.panel` + `.mission-card` patterns
- Add `.back-btn` style for the back/return button
- Keep consistent with existing dark/light theme variables

## Verification

1. Run `npm run dev` — confirm no build errors
2. Navigate to `/learn` — should see 3 group cards instead of word grid
3. Click each group — should show filtered words with correct counts
4. Search within a group — should filter only that group's words
5. Back button returns to group selection
6. Mark learned works within a group, count updates
7. Dark mode still works correctly
8. Run `npm run test` — existing tests should pass
9. Run `npm run lint` — no lint errors
