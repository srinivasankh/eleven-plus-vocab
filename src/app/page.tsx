"use client";

import Link from "next/link";
import { useProgressState } from "@/hooks/useProgressState";

export default function HomePage() {
  const { progress } = useProgressState();

  const hasActiveQuiz = Boolean(progress?.activeQuiz);
  const learnedCount = progress?.learnedWordIds.length ?? 0;
  const attempts = progress?.quizHistory.length ?? 0;
  const latestScore = progress?.quizHistory[progress.quizHistory.length - 1];

  return (
    <section className="page hero">
      <section className="hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Word Adventure Deck</p>
          <h1>Train 11+ vocabulary with game-style daily missions.</h1>
          <p>
            Build confidence one round at a time. Explore advanced words, sharpen recall, and track momentum.
          </p>
        </div>

        <div className="hero-actions">
          <Link className="cta" href="/quiz">Start Quiz Mission</Link>
          <Link className="cta ghost" href="/learn">Open Word Library</Link>
          <Link className="cta ghost" href="/progress">View Dashboard</Link>
        </div>

        <div className="hero-stats" aria-label="Learning snapshot">
          <article className="hero-stat">
            <p className="label">Words learned</p>
            <p className="value">{learnedCount}</p>
            <p className="hint">Tracked on this device</p>
          </article>

          <article className="hero-stat">
            <p className="label">Quiz attempts</p>
            <p className="value">{attempts}</p>
            <p className="hint">Every round improves recall</p>
          </article>

          <article className="hero-stat">
            <p className="label">Latest score</p>
            <p className="value">{latestScore ? `${latestScore.score}/${latestScore.total}` : "-"}</p>
            <p className="hint">{hasActiveQuiz ? "Saved mission available" : "No active mission"}</p>
          </article>
        </div>
      </section>

      <section className="mission-grid" aria-label="Main actions">
        <article className="panel mission-card">
          <span className="mission-tag">Step 1</span>
          <h2>Collect New Words</h2>
          <p>Browse definitions, examples, and opposites. Mark each mastered word to build momentum.</p>
          <Link className="cta" href="/learn">Go to Learn</Link>
        </article>

        <article className="panel mission-card">
          <span className="mission-tag">Step 2</span>
          <h2>Play Quiz Rounds</h2>
          <p>Challenge yourself with rapid-choice questions and immediate feedback for every answer.</p>
          <Link className="cta" href="/quiz">Launch Quiz</Link>
          {hasActiveQuiz ? <Link className="link-inline" href="/quiz?mode=resume">Resume saved quiz mission</Link> : null}
        </article>

        <article className="panel mission-card">
          <span className="mission-tag">Step 3</span>
          <h2>Check Mastery</h2>
          <p>See learned totals, latest scores, and recent attempts in one clear progress board.</p>
          <Link className="cta" href="/progress">Open Progress</Link>
        </article>
      </section>
    </section>
  );
}
