"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetProgressAction } from "@/app/actions/progress";
import { LegacyImportBanner } from "@/components/LegacyImportBanner";
import { useMounted } from "@/hooks/useMounted";
import { ProgressSnapshot } from "@/lib/types";

type Props = {
  childName: string;
  snapshot: ProgressSnapshot;
};

export function ProgressDashboard({ childName, snapshot }: Props) {
  const router = useRouter();
  const mounted = useMounted(); // dates are formatted in the viewer's time zone, after hydration
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, startReset] = useTransition();

  const learned = snapshot.learnedHeadwords.length;
  const totalWords = snapshot.totalWords;
  const percentage = totalWords ? Math.round((learned / totalWords) * 100) : 0;
  const latest = snapshot.recentResults[0];
  const attempts = snapshot.attempts;
  const best = snapshot.best;

  function handleReset() {
    if (!window.confirm(`Reset all of ${childName}'s learned words and quiz history? This can't be undone.`)) return;
    setResetError(null);
    startReset(async () => {
      const result = await resetProgressAction();
      if (result.ok) router.refresh();
      else setResetError(result.error);
    });
  }

  return (
    <section className="page progress">
      <header className="section-head page-banner">
        <h1>Mastery Dashboard</h1>
        <p>{childName}&apos;s progress is saved to your family account, on every device.</p>
      </header>

      <LegacyImportBanner childName={childName} />

      <div className="progress-grid">
        <article className="panel dashboard-card">
          <p className="dashboard-label">Vocabulary Mastery</p>
          <p className="big-number">{learned}/{totalWords}</p>
          <div className="mastery-meter" aria-label="Mastery progress bar">
            <div className="mastery-fill" style={{ width: `${percentage}%` }} />
          </div>
          <p>{percentage}% of words learned.</p>
        </article>

        <article className="panel dashboard-card">
          <p className="dashboard-label">Quiz Momentum</p>
          <p className="big-number">{attempts}</p>
          <p>Total attempts recorded.</p>
          <p>Best score so far: <strong>{best ? `${best.score}/${best.total}` : "-"}</strong></p>
        </article>

        <article className="panel dashboard-card">
          <p className="dashboard-label">Latest Mission</p>
          {latest ? (
            <>
              <p className="big-number">{latest.score}/{latest.total}</p>
              <p>{mounted ? new Date(latest.ts).toLocaleString() : " "}</p>
            </>
          ) : (
            <p>No quiz attempts yet. <Link href="/quiz">Start one now.</Link></p>
          )}
        </article>
      </div>

      <section className="panel history-panel">
        <h2>Recent Quiz Attempts</h2>
        {snapshot.recentResults.length === 0 ? (
          <p>Nothing yet.</p>
        ) : (
          <ul className="history-list">
            {snapshot.recentResults.map((item) => (
              <li key={item.ts}>
                <span>{mounted ? new Date(item.ts).toLocaleDateString() : " "}</span>
                <span>{item.score}/{item.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="danger-zone">
        {resetError ? (
          <p className="form-error" role="alert">
            {resetError}
          </p>
        ) : null}
        <button className="cta danger" disabled={resetting} onClick={handleReset} type="button">
          {resetting ? "Resetting…" : "Reset saved progress"}
        </button>
      </div>
    </section>
  );
}
