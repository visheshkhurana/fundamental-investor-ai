import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Piotroski F-Score explained — Fundamental Investor AI",
  description:
    "Joseph Piotroski's 9-point financial-strength signal (2000). Plain-English explainer of the nine signals, what '7' vs '3' actually means, and how to use it without misreading it.",
};

export default function Piotroski() {
  return (
    <article className="max-w-2xl mx-auto prose prose-slate">
      <Link href="/learn" className="no-underline text-xs text-foreground/60">
        ← Back to Learn
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">The Piotroski F-Score</h1>
      <p className="text-foreground/60 text-sm mt-0">
        A 9-point financial-strength signal. Joseph Piotroski, 2000.
      </p>

      <h2 className="mt-8">The one-minute version</h2>
      <p>
        Joseph Piotroski was a Stanford accounting professor who asked a useful
        question: if you filter the cheapest-looking 20% of stocks by price-to-book
        ratio, most of them turn out to be value traps. Can a simple scorecard
        separate the real bargains from the wreckage?
      </p>
      <p>
        His answer was <b>yes</b>. Nine binary signals — each worth one point —
        that together measure whether a company's <i>financial health</i> is
        improving or deteriorating. Stocks scoring 8–9 outperformed stocks
        scoring 0–2 by roughly 7.5% annually in his backtest (1976–1996). The
        F-Score has survived out-of-sample testing since.
      </p>

      <h2 className="mt-8">The nine signals</h2>
      <p>Four profitability signals, three leverage & liquidity signals, two efficiency signals.</p>

      <h3>Profitability</h3>
      <ol>
        <li>
          <b>Positive net income</b> in the current year. Either you made money or
          you didn't.
        </li>
        <li>
          <b>Positive return on assets (ROA)</b>. Net income divided by total
          assets. Positive means the business is generating returns from its
          resources.
        </li>
        <li>
          <b>Positive cash flow from operations</b>. The company is generating
          real cash, not just accounting profit.
        </li>
        <li>
          <b>Operating cash flow exceeds net income</b>. Translation: earnings
          aren't being inflated by accruals. This is the single most
          telling signal for spotting earnings-quality problems.
        </li>
      </ol>

      <h3>Leverage & liquidity</h3>
      <ol start={5}>
        <li>
          <b>Long-term debt went down</b> year-over-year (or stayed flat if the
          company has none). Deleveraging is a vote of financial confidence.
        </li>
        <li>
          <b>Current ratio improved</b>. Current assets divided by current
          liabilities — the classic short-term solvency check.
        </li>
        <li>
          <b>No new shares issued</b>. Share issuance dilutes existing holders
          and is often a sign of capital stress.
        </li>
      </ol>

      <h3>Operating efficiency</h3>
      <ol start={8}>
        <li>
          <b>Gross margin improved</b>. Pricing power or cost discipline —
          either way, a good sign.
        </li>
        <li>
          <b>Asset turnover improved</b>. Revenue divided by assets. The company
          is sweating its balance sheet harder.
        </li>
      </ol>

      <h2 className="mt-8">How to read the score</h2>
      <p>Interpretation is direct:</p>
      <ul>
        <li>
          <b>8 or 9</b> — <i>strong</i>. All nine signals pointing the right way
          is rare and meaningful.
        </li>
        <li>
          <b>5–7</b> — <i>mixed</i>. The majority is positive, but at least some
          red flags. Read which signals failed before concluding anything.
        </li>
        <li>
          <b>0–4</b> — <i>weak</i>. The balance sheet or P&amp;L is deteriorating.
          Not a strict sell, but the burden of proof shifts sharply to the
          bull case.
        </li>
      </ul>

      <h2 className="mt-8">What the F-Score is not</h2>
      <ul>
        <li>
          <b>It's not a valuation tool.</b> Piotroski's genius was pairing the
          F-Score with a cheapness screen (low P/B). High F-Score alone isn't an
          edge if the stock is priced for perfection.
        </li>
        <li>
          <b>It's backward-looking.</b> Every signal is last-year-vs-prior-year.
          A stock with a perfect 9 today can still be disrupted tomorrow.
        </li>
        <li>
          <b>It can't see intangible risk.</b> Regulatory shifts, key-man risk,
          accounting fraud — all invisible to the F-Score.
        </li>
      </ul>

      <h2 className="mt-8">How Fundamental Investor AI uses it</h2>
      <p>
        Every stock gets an F-Score displayed on its dashboard and in the screener.
        Our current implementation computes six of the nine signals from a single
        fundamentals snapshot (profitability, liquidity, leverage). The three
        year-over-year comparison signals — margin change, asset-turnover change,
        share-count change — require two quarters of data we don't always have,
        so we conservatively project the F-Score by scaling the signals we do
        compute. Translation: our score is a reasonable proxy, not a formal F-Score
        audit.
      </p>

      <div className="card p-5 not-prose mt-8 bg-white/5">
        <div className="font-semibold">Try it live</div>
        <p className="text-sm text-foreground/70 mt-1">
          Open any stock — the F-Score appears in the "Advanced signals" panel
          with the current score out of 9 and the individual signals we checked.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link
            href="/s/NYSE/V"
            className="underline underline-offset-2"
          >
            Visa (usually 9/9)
          </Link>
          <span className="text-foreground/30">·</span>
          <Link
            href="/s/NSE/TCS"
            className="underline underline-offset-2"
          >
            TCS (usually 8/9)
          </Link>
          <span className="text-foreground/30">·</span>
          <Link
            href="/screen?minPiotroski=8"
            className="underline underline-offset-2"
          >
            Screen for F-Score ≥ 8
          </Link>
        </div>
      </div>

      <h2 className="mt-8">Further reading</h2>
      <ul>
        <li>
          Piotroski, J. (2000). <i>Value Investing: The Use of Historical
          Financial Statement Information to Separate Winners from Losers.</i>{" "}
          Journal of Accounting Research, 38.
        </li>
        <li>Chiu, B. & Chin, J. (2012). Out-of-sample validation in the Taiwanese market.</li>
        <li>Galdi, F. &amp; Lopes, A. (2013). Emerging-markets replication.</li>
      </ul>
    </article>
  );
}
