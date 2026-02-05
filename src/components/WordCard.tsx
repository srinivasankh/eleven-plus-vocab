"use client";

import { useState } from "react";
import { VocabEntry } from "@/lib/types";

type Props = {
  entry: VocabEntry;
  learned: boolean;
  onToggleLearned: (id: number) => void;
};

export function WordCard({ entry, learned, onToggleLearned }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <article className="word-card">
      <div className="word-card-head">
        <div>
          <p className="word-meta">#{entry.id} · {entry.type}</p>
          <h3>{entry.word}</h3>
        </div>
        <div className="word-actions">
          <button className="chip-btn" onClick={() => setOpen((value) => !value)} type="button">
            {open ? "Hide" : "Reveal"}
          </button>
          <button
            className={learned ? "chip-btn solid" : "chip-btn"}
            onClick={() => onToggleLearned(entry.id)}
            type="button"
          >
            {learned ? "Learned" : "Mark learned"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="word-details">
          <p><strong>Meaning:</strong> {entry.meaning}</p>
          <p><strong>Synonyms:</strong> {entry.synonyms.join(", ")}</p>
          <p><strong>Antonyms:</strong> {entry.antonyms.length ? entry.antonyms.join(", ") : "None listed"}</p>
          <p><strong>Example:</strong> {entry.examples[0]}</p>
        </div>
      ) : null}
    </article>
  );
}
