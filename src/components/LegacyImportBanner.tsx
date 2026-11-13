"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { importLegacyProgressAction } from "@/app/actions/legacyImport";
import {
  LEGACY_DISMISSED_KEY,
  LEGACY_IMPORTED_KEY,
  LEGACY_PROGRESS_KEY,
  LegacyProgress,
  parseLegacyProgress,
} from "@/lib/legacyProgress";

function readLegacy(): { raw: string; data: LegacyProgress } | null {
  try {
    if (window.localStorage.getItem(LEGACY_DISMISSED_KEY)) return null;
    const raw = window.localStorage.getItem(LEGACY_PROGRESS_KEY);
    if (!raw) return null;
    const data = parseLegacyProgress(JSON.parse(raw));
    return data ? { raw, data } : null;
  } catch {
    return null; // storage blocked or corrupt data: just don't offer
  }
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * One-time offer to add progress saved in this browser by the pre-accounts WordSpark to the
 * active learner. Renders nothing unless such progress exists.
 */
export function LegacyImportBanner({ childName }: { childName: string }) {
  const router = useRouter();
  const [found, setFound] = useState<{ raw: string; data: LegacyProgress } | null>(null);
  const [message, setMessage] = useState<{ kind: "done" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setFound(readLegacy());
  }, []);

  if (!found && !message) return null;

  function handleImport() {
    if (!found) return;
    setMessage(null);
    startTransition(async () => {
      const result = await importLegacyProgressAction(found.data);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      try {
        // Keep a copy, but stop offering it again on this device.
        window.localStorage.setItem(LEGACY_IMPORTED_KEY, found.raw);
        window.localStorage.removeItem(LEGACY_PROGRESS_KEY);
      } catch {
        // Ignore: importing again is harmless (duplicates are skipped on the server).
      }
      setFound(null);
      if (result.data.alreadyImported) {
        setMessage({ kind: "done", text: `Progress from this device was already added to ${childName}'s account.` });
        return;
      }
      setMessage({
        kind: "done",
        text: `Added ${plural(result.data.wordsAdded, "word", "words")} and ${plural(
          result.data.resultsAdded,
          "quiz result",
          "quiz results",
        )} to ${childName}'s progress.`,
      });
      router.refresh();
    });
  }

  function handleDismiss() {
    try {
      window.localStorage.setItem(LEGACY_DISMISSED_KEY, "1");
    } catch {
      // Ignore: the offer will simply show again next time.
    }
    setFound(null);
  }

  if (!found && message) {
    return (
      <p className={message.kind === "done" ? "form-success" : "form-error"} role="status">
        {message.text}
      </p>
    );
  }

  if (!found) return null;
  const { learnedWordIds, quizHistory } = found.data;

  return (
    <section className="panel legacy-import" aria-label="Progress found on this device">
      <h2>We found progress on this device</h2>
      <p>
        This browser has {plural(learnedWordIds.length, "learned word", "learned words")} and{" "}
        {plural(quizHistory.length, "quiz result", "quiz results")} saved from before WordSpark had accounts.
        Would you like to add them to {childName}&apos;s progress?
      </p>
      {message?.kind === "error" ? (
        <p className="form-error" role="alert">
          {message.text}
        </p>
      ) : null}
      <div className="hero-actions">
        <button className="cta" disabled={pending} onClick={handleImport} type="button">
          {pending ? "Adding…" : `Add to ${childName}`}
        </button>
        <button className="cta ghost" disabled={pending} onClick={handleDismiss} type="button">
          No thanks
        </button>
      </div>
    </section>
  );
}
