import { Baloo_2, Nunito } from "next/font/google";

// Shared by the root layout and the last-resort error page, which renders without the layout.
export const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-headline",
  weight: ["600", "700"],
});

export const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
});
