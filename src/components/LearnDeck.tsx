"use client";

import { useMemo, useState } from "react";
import { WordCard } from "@/components/WordCard";
import { useProgressState } from "@/hooks/useProgressState";
import { Difficulty, WordEntry } from "@/lib/types";

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
};

export function LearnDeck({ entries }: Props) {
  const { progress, setProgress } = useProgressState();
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Difficulty | null>(null);
  const [bulkOpen, setBulkOpen] = useState<{ value: boolean; version: number } | null>(null);
  const [showUnlearnedOnly, setShowUnlearnedOnly] = useState(false);

  const difficultyCounts = useMemo(() => {
    const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const entry of entries) counts[entry.difficulty] += 1;
    return counts;
  }, [entries]);

  const difficultyById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry.difficulty])),
    [entries],
  );

  const groupEntries = useMemo(() => {
    if (!selectedGroup) return [];
    return entries.filter((entry) => entry.difficulty === selectedGroup);
  }, [entries, selectedGroup]);

  const learnedIds = useMemo(() => new Set(progress?.learnedWordIds ?? []), [progress]);

  const filtered = useMemo(() => {
    let result = groupEntries;
    if (showUnlearnedOnly) {
      result = result.filter((entry) => !learnedIds.has(entry.id));
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
  }, [query, groupEntries, showUnlearnedOnly, learnedIds]);

  function toggleLearned(id: number) {
    if (!progress) return;
    const exists = progress.learnedWordIds.includes(id);
    setProgress({
      ...progress,
      learnedWordIds: exists
        ? progress.learnedWordIds.filter((item) => item !== id)
        : [...progress.learnedWordIds, id],
    });
  }

  function handleBack() {
    setSelectedGroup(null);
    setQuery("");
    setBulkOpen(null);
    setShowUnlearnedOnly(false);
  }

  const learnedCount = progress?.learnedWordIds.length ?? 0;

  function masteredInGroup(difficulty: Difficulty): number {
    if (!progress) return 0;
    return progress.learnedWordIds.filter(
      (id) => difficultyById.get(id) === difficulty,
    ).length;
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
          <span className="meta-pill">Showing {filtered.length} words</span>
          <span className="meta-pill">Total in group {groupEntries.length}</span>
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

      <div className="word-grid">
        {filtered.map((entry) => (
          <WordCard
            entry={entry}
            forceOpen={bulkOpen}
            key={entry.id}
            learned={learnedIds.has(entry.id)}
            onToggleLearned={toggleLearned}
          />
        ))}
      </div>
    </section>
  );
}
