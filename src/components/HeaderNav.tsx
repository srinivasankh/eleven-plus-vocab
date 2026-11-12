"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/quiz", label: "Quiz" },
  { href: "/progress", label: "Progress" },
];

export type HeaderAccount = {
  childName: string | null;
} | null;

export function HeaderNav({ account }: { account: HeaderAccount }) {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="brand-wrap">
        <span aria-hidden="true" className="brand-orb">WS</span>
        <div className="brand-text">
          <span className="brand-kicker">11+ UK Vocabulary</span>
          <span className="brand-name">WordSpark Missions</span>
        </div>
        <span className="brand-xp">XP Mode</span>
      </div>

      <div className="header-controls">
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {links.map((link) => (
              <li key={link.href}>
                <Link className={pathname === link.href ? "nav-link active" : "nav-link"} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ThemeToggle />
        <div className="account-controls">
          {account ? (
            <>
              <Link className="chip-btn" href="/profiles" title="Switch learner">
                {account.childName ?? "Choose learner"}
              </Link>
              <form action={signOutAction}>
                <button className="chip-btn" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link className="chip-btn solid" href="/sign-in">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
