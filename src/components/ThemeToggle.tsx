"use client";

import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      aria-checked={dark}
      aria-label="Toggle light and dark theme"
      className={dark ? "theme-toggle is-dark" : "theme-toggle"}
      onClick={toggleTheme}
      role="switch"
      type="button"
    >
      <span aria-hidden="true" className="theme-track">
        <span className="theme-thumb" />
      </span>
      <span className="theme-label">{dark ? "Dark" : "Light"}</span>
    </button>
  );
}
