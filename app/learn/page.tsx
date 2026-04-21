import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn the frameworks · Fundamental Investor AI",
  description:
    "Piotroski F-Score, Altman Z-Score, economic moats, DCF, PEG — plain-English explainers of the frameworks used to score every stock on Fundamental Investor AI.",
};

const DOCS = [
  {
    slug: "piotroski-f-score",
    title: "The Piotroski F-Score",
    dek: "A 9-point financial-strength signal. How it works, why it matters, and what a '7' actually tells you.",
    one_minute: "Developed by Joseph Piotroski in 2000 to separate real value stocks from value traps.",
  },
  {
    slug: "altman-z-score",
    title: "The Altman Z-Score",
    dek: "Edward Altman's 1968 bankruptcy predictor. The three zones — safe, grey, distress — and what each means for a long-term investor.",
    one_minute: "A composite of five balance-sheet and income ratios that flags insolvency risk years before it happens.",
  },
  {
    slug: "moats",
    title: "Economic moats: the 5 types",
    dek: "Pat Dorsey's framework for durable competitive advantage. Network effects, switching costs, intangibles, scale, regulatory.",
    one_minute: "Moats explain why some great companies stay great for decades while others see their returns erode.",
  },
  {
    slug: "dcf",
    title: "DCF fair value for the rest of us",
    dek: "The two-stage discounted cashflow model — the math, the assumptions, and why your answer is often wrong in a useful way.",
    one_minute: "A company's intrinsic value is the discounted sum of its future free cash flows. The rest is estimation.",
  },
  {
    slug: "peg",
    title: "Peter Lynch's PEG ratio",
    dek: "Why a P/E of 30 can be cheaper than a P/E of 10. The simple ratio that separates growth stocks from expensive ones.",
    one_minute: "PEG = P/E ÷ earnings-growth-rate. Below 1 is often cheap, above 2 is often rich.",
  },
];

export default function LearnIndex() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-2">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          The frameworks, explained
        </h1>
        <p className="mt-3 text-foreground/70 text-base max-w-2xl">
          Every stock on Fundamental Investor AI is graded using the same six
          frameworks that professional equity analysts and serious long-term
          investors have used for decades. Here's how each one actually works —
          in plain English, no jargon walls.
        </p>
      </header>

      <div className="space-y-3">
        {DOCS.map((d) => (
          <Link
            key={d.slug}
            href={`/learn/${d.slug}`}
            className="block card card-hover p-5"
          >
            <h2 className="font-semibold text-lg">{d.title}</h2>
            <p className="text-sm text-foreground/70 mt-1">{d.dek}</p>
            <p className="text-xs text-foreground/60 italic mt-2">{d.one_minute}</p>
            <span className="inline-block mt-3 text-xs text-foreground font-medium">
              Read →
            </span>
          </Link>
        ))}
      </div>

      <section className="card p-5 bg-white/5">
        <h2 className="font-semibold">Why learn these</h2>
        <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
          You don't need these to use Fundamental Investor AI — the app does the
          math for you. But investors who understand <i>why</i> a stock scored
          8.2 rather than 5.0 make better decisions than those who treat the
          number as a black box. Read one a day for a week; it's maybe the best
          ten minutes you'll spend on investing all year.
        </p>
      </section>

      <p className="text-xs text-foreground/40">
        Everything here is educational, not advice. See the{" "}
        <Link href="/about" className="underline">
          About page
        </Link>{" "}
        for disclaimers and data sources.
      </p>
    </div>
  );
}
