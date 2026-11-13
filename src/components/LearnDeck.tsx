"use client";

import { useMemo, useState } from "react";
import { setLearnedAction } from "@/app/actions/progress";
import { WordCard } from "@/components/WordCard";
import { Difficulty, WordEntry } from "@/lib/types";
import { countLearnedWords, countWords, countWordsByDifficulty } from "@/lib/wordCounts";

const groupMeta: Record<
  Difficulty,
  { label: string; description: string; emoji: string }
> = {
  easy: {
    label: "Easy",
    description: "Everyday words you probably already know. Build confidence here!",
    emoji: "\u2B50",
  },
  medium: {
    label: "Medium",
    description: "Words you'll find in school books. A great next challenge!",
    emoji: "\uD83D\uDE80",
  },
  hard: {
    label: "Hard",
    description: "Advanced words that will make your vocabulary shine.",
    emoji: "\uD83D\uDD25",
  },
};

const groups: Difficulty[] = ["easy", "medium", "hard"];

type Props = {
  entries: WordEntry[];
  /** Headwords this child has already learned (from the server). */
  initialLearned: string[];
};

export function LearnDeck({ entries, initialLearned }: Props) {
  const [learned, setLearned] = useState<Set<string>>(() => new Set(initialLearned));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Difficulty | null>(null);
  const [bulkOpen, setBulkOpen] = useState<{ value: boolean; version: number } | null>(null);
  const [showUnlearnedOnly, setShowUnlearnedOnly] = useState(false);

  const difficultyCounts = useMemo(() => countWordsByDifficulty(entries), [entries]);

  const groupEntries = useMemo(() => {
    if (!selectedGroup) return [];
    return entries.filter((entry) => entry.difficulty === selectedGroup);
  }, [entries, selectedGroup]);


  const filtered = useMemo(() => {
    let result = groupEntries;
    if (showUnlearnedOnly) {
      result = result.filter((entry) => !learned.has(entry.headword));
    }
    if (query.trim()) {
      const lowered = query.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.word.toLowerCase().includes(lowered) ||
          entry.meaning.toLowerCase().includes(lowered) ||
          entry.synonyms.join(" ").toLowerCase().includes(lowered),
      );
    }
    return result;
  }, [query, groupEntries, showUnlearnedOnly, learned]);

  function updateLearned(headword: string, isLearned: boolean) {
    setLearned((previous) => {
      const next = new Set(previous);
      if (isLearned) next.add(headword);
      else next.delete(headword);
      return next;
    });
  }

  /** Updates the screen straight away, then saves; undoes the change if saving fails. */
  async function toggleLearned(id: number) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    const nowLearned = !learned.has(entry.headword);

    setSaveError(null);
    updateLearned(entry.headword, nowLearned);

    const result = await setLearnedAction({ wordId: id, learned: nowLearned });
    if (!result.ok) {
      updateLearned(entry.headword, !nowLearned);
      setSaveError(result.error);
    }
  }

  function handleBack() {
    setSelectedGroup(null);
    setQuery("");
    setBulkOpen(null);
    setShowUnlearnedOnly(false);
  }

  const learnedCount = learned.size;

  function masteredInGroup(difficulty: Difficulty): number {
    return countLearnedWords(
      entries.filter((entry) => entry.difficulty === difficulty),
      learned,
    );
  }

  if (!selectedGroup) {
    return (
      <section className="page learn">
        <header className="section-head page-banner">
          <div className="banner-row">
            <div>
              <h1>Learning Deck</h1>
              <p>Pick a difficulty level and start exploring words.</p>
            </div>
            <span className="kicker-pill">{learnedCount} learned</span>
          </div>
        </header>

        <div className="mission-grid">
          {groups.map((difficulty) => {
            const meta = groupMeta[difficulty];
            const total = difficultyCounts[difficulty];
            const mastered = masteredInGroup(difficulty);
            return (
              <button
                className="panel group-card"
                key={difficulty}
                onClick={() => setSelectedGroup(difficulty)}
                type="button"
              >
                <span className="group-emoji">{meta.emoji}</span>
                <h2>{meta.label}</h2>
                <p>{meta.description}</p>
                <div className="meta-row">
                  <span className="meta-pill">{total} words</span>
                  <span className="meta-pill">{mastered} mastered</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  const meta = groupMeta[selectedGroup];

  return (
    <section className="page learn">
      <header className="section-head page-banner">
        <div className="banner-row">
          <div>
            <button className="back-btn" onClick={handleBack} type="button">
              &larr; All Groups
            </button>
            <h1>{meta.emoji} {meta.label} Words</h1>
            <p>{meta.description}</p>
          </div>
          <span className="kicker-pill">{masteredInGroup(selectedGroup)} learned</span>
        </div>
      </header>

      <section className="panel">
        <label className="search-wrap" htmlFor="search-words">
          <span>Search words, meanings, or synonyms</span>
          <input
            id="search-words"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: resilient"
            type="search"
            value={query}
          />
        </label>

        <div className="meta-row" aria-label="Search summary">
          <span className="meta-pill">Showing {countWords(filtered)} words</span>
          <span className="meta-pill">Total in group {countWords(groupEntries)}</span>
          <span className="meta-pill">Mastered {masteredInGroup(selectedGroup)}</span>
        </div>
      </section>

      <div className="bulk-actions">
        <button
          className="chip-btn"
          onClick={() => setBulkOpen((prev) => ({ value: true, version: (prev?.version ?? 0) + 1 }))}
          type="button"
        >
          Reveal All
        </button>
        <button
          className="chip-btn"
          onClick={() => setBulkOpen((prev) => ({ value: false, version: (prev?.version ?? 0) + 1 }))}
          type="button"
        >
          Hide All
        </button>
        <button
          className={showUnlearnedOnly ? "chip-btn solid" : "chip-btn"}
          onClick={() => setShowUnlearnedOnly((v) => !v)}
          type="button"
        >
          {showUnlearnedOnly ? "Show all words" : "Show unlearned only"}
        </button>
      </div>

      {saveError ? (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="word-grid">
        {filtered.map((entry) => (
          <WordCard
            entry={entry}
            forceOpen={bulkOpen}
            key={entry.id}
            learned={learned.has(entry.headword)}
            onToggleLearned={toggleLearned}
          />
        ))}
      </div>
    </section>
  );
}
