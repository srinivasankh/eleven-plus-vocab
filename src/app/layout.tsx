import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import { HeaderNav } from "@/components/HeaderNav";
import { DataWarningFooter } from "@/components/DataWarningFooter";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${baloo.variable} ${nunito.variable}`}>
        <div className="background-decor" aria-hidden="true" />
        <div className="app-shell">
          <HeaderNav />
          <main>{children}</main>
          <DataWarningFooter />
        </div>
      </body>
    </html>
  );
}
