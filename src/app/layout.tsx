import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import Script from "next/script";
import "./globals.css";
import { baloo, nunito } from "@/app/fonts";
import { HeaderNav, HeaderAccount } from "@/components/HeaderNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { log } from "@/server/log";
import { getActiveChild, getParent } from "@/server/session";

// Every page depends on who is signed in, so nothing is pre-built at build time. This is also
// what lets `next build` run without a database (e.g. on Vercel before DATABASE_URL is set).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WordSpark 11+ Quiz",
  description: "Kid-friendly 11+ vocabulary practice and quizzes.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // If the account lookup fails (e.g. the database is down), still render the shell so the page's
  // own error screen appears with the normal header, rather than the bare last-resort page.
  let account: HeaderAccount = null;
  try {
    const parent = await getParent();
    const activeChild = parent ? await getActiveChild() : null;
    account = parent ? { childName: activeChild?.displayName ?? null } : null;
  } catch (error) {
    // Let Next's own control-flow signals through (e.g. the "this page is dynamic" signal used
    // at build time); only real failures fall back to a signed-out header.
    unstable_rethrow(error);
    log.error("layout.account_lookup_failed", error);
  }

  return (
    <html lang="en">
      <body className={`${baloo.variable} ${nunito.variable}`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const key = "eleven_plus_theme_v1";
              const saved = localStorage.getItem(key);
              const theme =
                saved === "light" || saved === "dark"
                  ? saved
                  : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch (_error) {}
          })();`}
        </Script>
        <ThemeProvider>
          <div className="background-decor" aria-hidden="true" />
          <div className="app-shell">
            <HeaderNav account={account} />
            <main>{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
