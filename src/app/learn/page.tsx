"use client";

import { useMemo, useState } from "react";
import { WordCard } from "@/components/WordCard";
import { useProgressState } from "@/hooks/useProgressState";
import { getVocabEntries } from "@/lib/vocabData";

const entries = getVocabEntries();

export default function LearnPage() {
  const { progress, setProgress } = useProgressState();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return entries;
    }

    const lowered = query.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.word.toLowerCase().includes(lowered) ||
        entry.meaning.toLowerCase().includes(lowered) ||
        entry.synonyms.join(" ").toLowerCase().includes(lowered),
    );
  }, [query]);

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

  const learnedIds = new Set(progress?.learnedWordIds ?? []);
  const learnedCount = progress?.learnedWordIds.length ?? 0;

  return (
    <section className="page learn">
      <header className="section-head page-banner">
        <div className="banner-row">
          <div>
            <h1>Learning Deck</h1>
            <p>Search, reveal, and lock each advanced word into long-term memory.</p>
          </div>
          <span className="kicker-pill">{learnedCount} learned</span>
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
          <span className="meta-pill">Total library {entries.length}</span>
          <span className="meta-pill">Mastered {learnedCount}</span>
        </div>
      </section>

      <div className="word-grid">
        {filtered.slice(0, 150).map((entry) => (
          <WordCard
            entry={entry}
            key={entry.id}
            learned={learnedIds.has(entry.id)}
            onToggleLearned={toggleLearned}
          />
        ))}
      </div>
    </section>
  );
}
