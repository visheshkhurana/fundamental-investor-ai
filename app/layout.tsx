import "./globals.css";
import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic", "normal"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fundamental Investor AI — invest like a researcher",
  description:
    "Every stock scored against the frameworks Buffett, Lynch, and Dorsey actually use — Piotroski F-Score, Altman Z, DCF, moats. Claude explains every score in plain English.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`}>
      <body className="min-h-screen font-sans bg-background text-foreground">
        <Nav />
        <main className="max-w-6xl mx-auto px-4 pt-20 pb-6">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-foreground/50 border-t border-white/10 mt-10">
          Research tooling, not investment advice. Past performance does not guarantee future
          results. Consult a registered advisor (SEBI in India, SEC in US) before making investment
          decisions. Data from Yahoo Finance (unofficial). AI analysis powered by Claude.
        </footer>
      </body>
    </html>
  );
}
