"use client";

import "./globals.css";
import { baloo, nunito } from "@/app/fonts";

/** Last resort when the root layout itself fails: it replaces the whole page, so it brings its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${nunito.variable}`}>
        <div className="app-shell">
          <main>
            <section className="page">
              <header className="section-head page-banner">
                <h1>Oops! Something went wrong</h1>
                <p>WordSpark couldn&apos;t load just now. Please try again in a moment.</p>
              </header>
              <section className="panel error-panel">
                <div className="hero-actions">
                  <button className="cta" onClick={reset} type="button">
                    Try again
                  </button>
                  {/* A plain link: the app's router may be what failed. */}
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a className="cta ghost" href="/">
                    Go to Home
                  </a>
                </div>
                {error.digest ? <p className="error-code">Error code: {error.digest}</p> : null}
              </section>
            </section>
          </main>
        </div>
      </body>
    </html>
  );
}
