import Link from "next/link";

export default function NotFound() {
  return (
    <section className="page">
      <header className="section-head page-banner">
        <h1>We couldn&apos;t find that page</h1>
        <p>The link might be old or mistyped. Let&apos;s get you back to your missions.</p>
      </header>

      <section className="panel error-panel">
        <div className="hero-actions">
          <Link className="cta" href="/">
            Go to Home
          </Link>
          <Link className="cta ghost" href="/learn">
            Open Word Library
          </Link>
        </div>
      </section>
    </section>
  );
}
