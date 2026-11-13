"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown inside the normal layout when a page fails to load. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The server has already logged the details; this helps when debugging in the browser.
    console.error(error);
  }, [error]);

  return (
    <section className="page">
      <header className="section-head page-banner">
        <h1>Oops! Something went wrong</h1>
        <p>That page didn&apos;t load properly. It&apos;s not your fault — please try again.</p>
      </header>

      <section className="panel error-panel">
        <div className="hero-actions">
          <button className="cta" onClick={reset} type="button">
            Try again
          </button>
          <Link className="cta ghost" href="/">
            Go to Home
          </Link>
        </div>
        {error.digest ? <p className="error-code">Error code: {error.digest}</p> : null}
      </section>
    </section>
  );
}
