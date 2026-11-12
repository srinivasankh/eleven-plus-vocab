import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { DataWarningFooter } from "@/components/DataWarningFooter";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getActiveChild, getParent } from "@/server/session";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["600", "700"],
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "WordSpark 11+ Quiz",
  description: "Kid-friendly 11+ vocabulary practice and quizzes.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const parent = await getParent();
  const activeChild = parent ? await getActiveChild() : null;
  const account = parent ? { childName: activeChild?.displayName ?? null } : null;

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
            <DataWarningFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
