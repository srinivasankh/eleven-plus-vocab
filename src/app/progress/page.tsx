"use client";

import Link from "next/link";
import { useProgressState } from "@/hooks/useProgressState";
import { defaultProgressState } from "@/lib/storage";
import { getVocabEntries } from "@/lib/vocabData";

const totalWords = getVocabEntries().length;

export default function ProgressPage() {
  const { progress, setProgress } = useProgressState();

  if (!progress) {
    return <section className="page"><p>Loading progress...</p></section>;
  }

  const learned = progress.learnedWordIds.length;
  const percentage = totalWords ? Math.round((learned / totalWords) * 100) : 0;
  const latest = progress.quizHistory[progress.quizHistory.length - 1];

  return (
    <section className="page progress">
      <header className="section-head">
        <h1>Your Progress</h1>
        <p>Progress is saved locally on this device/browser.</p>
      </header>

      <div className="progress-grid">
        <article className="panel">
          <h2>Words Learned</h2>
          <p className="big-number">{learned}</p>
          <p>of {totalWords} valid entries ({percentage}%).</p>
        </article>

        <article className="panel">
          <h2>Latest Quiz</h2>
          {latest ? (
            <>
              <p className="big-number">{latest.score}/{latest.total}</p>
              <p>{new Date(latest.ts).toLocaleString()}</p>
            </>
          ) : (
            <p>No quiz attempts yet. <Link href="/quiz">Start one now.</Link></p>
          )}
        </article>
      </div>

      <section className="panel history-panel">
        <h2>Recent Quiz Attempts</h2>
        {progress.quizHistory.length === 0 ? (
          <p>Nothing yet.</p>
        ) : (
          <ul className="history-list">
            {progress.quizHistory.slice(-8).reverse().map((item) => (
              <li key={item.ts}>
                <span>{new Date(item.ts).toLocaleDateString()}</span>
                <span>{item.score}/{item.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="danger-zone">
        <button className="cta danger" onClick={() => setProgress({ ...defaultProgressState, lastUpdated: new Date().toISOString() })} type="button">
          Reset saved progress
        </button>
      </div>
    </section>
  );
}
