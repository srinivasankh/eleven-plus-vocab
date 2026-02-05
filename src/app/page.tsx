"use client";

import Link from "next/link";
import { useProgressState } from "@/hooks/useProgressState";

export default function HomePage() {
  const { progress } = useProgressState();

  const hasActiveQuiz = Boolean(progress?.activeQuiz);
  const learnedCount = progress?.learnedWordIds.length ?? 0;

  return (
    <section className="page hero">
      <div className="hero-copy">
        <p className="eyebrow">11+ Exam Ready</p>
        <h1>Build vocabulary confidence with quick, fun quizzes.</h1>
        <p>
          WordSpark helps children preparing for the UK 11+ exam learn advanced words, test understanding,
          and pick up where they left off.
        </p>
      </div>

      <div className="hero-grid">
        <article className="panel">
          <h2>Start Learning</h2>
          <p>Explore all words, meanings, synonyms, antonyms and examples.</p>
          <Link className="cta" href="/learn">Open Word Library</Link>
        </article>

        <article className="panel">
          <h2>Take a Quiz</h2>
          <p>Multiple-choice rounds with instant feedback.</p>
          <Link className="cta" href="/quiz">Start New Quiz</Link>
          {hasActiveQuiz ? <Link className="link-inline" href="/quiz?mode=resume">Continue your saved quiz</Link> : null}
        </article>

        <article className="panel">
          <h2>Your Progress</h2>
          <p>{learnedCount} words marked learned on this device.</p>
          <Link className="cta" href="/progress">View Progress</Link>
        </article>
      </div>
    </section>
  );
}
