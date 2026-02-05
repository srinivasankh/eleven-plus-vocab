"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/learn", label: "Learn" },
  { href: "/quiz", label: "Quiz" },
  { href: "/progress", label: "Progress" },
];

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="brand-wrap">
        <span className="brand-kicker">11+ UK</span>
        <span className="brand-name">WordSpark</span>
      </div>
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
    </header>
  );
}
