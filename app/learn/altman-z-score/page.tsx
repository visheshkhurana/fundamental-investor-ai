import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Altman Z-Score explained — Fundamental Investor AI",
  description:
    "Edward Altman's 1968 bankruptcy predictor in plain English. What the Z formula measures, the three zones (safe, grey, distress), and where the model breaks.",
};

export default function Altman() {
  return (
    <article className="max-w-2xl mx-auto prose prose-slate">
      <Link href="/learn" className="no-underline text-xs text-foreground/60">
        ← Back to Learn
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">The Altman Z-Score</h1>
      <p className="text-foreground/60 text-sm mt-0">
        A bankruptcy predictor from 1968 that still works. Edward Altman.
      </p>

      <h2 className="mt-8">The one-minute version</h2>
      <p>
        In 1968 Edward Altman looked at 66 manufacturing companies — half of
        which had gone bankrupt within two years of their last filing — and
        asked whether a single number could have predicted the failures from
        the public financials alone.
      </p>
      <p>
        The answer was a weighted sum of five ratios, each tied to a different
        dimension of financial health: short-term liquidity, accumulated
        profitability, operating profitability, market confidence, and asset
        efficiency. Altman called it the <b>Z-Score</b>. Firms with Z below
        1.81 went bankrupt within two years 72% of the time in his sample.
        Firms above 2.99 never did.
      </p>

      <h2 className="mt-8">The formula</h2>
      <p>For public manufacturing firms, the original Z:</p>
      <pre className="bg-white/5 rounded p-4 text-xs">
{`Z = 1.2 × (Working Capital / Total Assets)
  + 1.4 × (Retained Earnings / Total Assets)
  + 3.3 × (EBIT / Total Assets)
  + 0.6 × (Market Cap / Total Liabilities)
  + 1.0 × (Sales / Total Assets)`}
      </pre>

      <h3>What each term actually measures</h3>
      <ul>
        <li>
          <b>Working Capital / Assets</b> — short-term liquidity. Can the
          company pay its bills without selling off equipment?
        </li>
        <li>
          <b>Retained Earnings / Assets</b> — <i>accumulated</i> profitability.
          How much of the balance sheet was built from reinvested earnings
          rather than external financing?
        </li>
        <li>
          <b>EBIT / Assets</b> — current operating profitability, stripped of
          tax structure and leverage noise.
        </li>
        <li>
          <b>Market Cap / Liabilities</b> — how much equity cushion the market
          is pricing in vs the debt stack.
        </li>
        <li>
          <b>Sales / Assets</b> — capital efficiency. A dollar of assets should
          generate dollars of revenue.
        </li>
      </ul>

      <h2 className="mt-8">The three zones</h2>
      <ul>
        <li>
          <b>Z &gt; 2.99 → safe zone.</b> Bankruptcy very unlikely in the next
          two years.
        </li>
        <li>
          <b>1.81 ≤ Z ≤ 2.99 → grey zone.</b> Monitor. The signal is not strong
          in either direction.
        </li>
        <li>
          <b>Z &lt; 1.81 → distress zone.</b> Significantly elevated bankruptcy
          risk.
        </li>
      </ul>

      <h2 className="mt-8">The fine print</h2>
      <ul>
        <li>
          <b>The original Z was trained on U.S. manufacturing firms.</b> Altman
          himself published Z' for private companies and Z'' for non-manufacturing
          firms with recalibrated coefficients.
        </li>
        <li>
          <b>It doesn't work for banks or insurance companies.</b> Their balance
          sheets are structurally different — huge liabilities funded by
          deposits and premiums, tiny working capital. Expect Z scores that
          don't mean what the zones say.
        </li>
        <li>
          <b>It's a probability, not a guarantee.</b> Plenty of firms in the
          distress zone have recovered; a few in the safe zone have imploded.
        </li>
      </ul>

      <h2 className="mt-8">How Fundamental Investor AI uses it</h2>
      <p>
        Every stock gets an approximated Z-Score on its dashboard. Because some
        line items (notably working capital and retained earnings) aren't
        cleanly exposed in summary financials, our Z is computed from
        market-cap, total debt, cash, revenue, and operating margin with
        conservative defaults for the other components. If the approximation
        produces a nonsensical value (&gt;25 or &lt;−5), we suppress it and
        display "—" rather than mislead you. For banks and insurers, treat the
        zone label as cosmetic, not literal.
      </p>

      <div className="card p-5 not-prose mt-8 bg-white/5">
        <div className="font-semibold">See it live</div>
        <p className="text-sm text-foreground/70 mt-1">
          Visit a few stocks to compare. Wide-moat franchises usually land
          squarely in the safe zone; leveraged cyclicals bounce around grey.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/s/NASDAQ/MSFT" className="underline">MSFT</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NYSE/V" className="underline">Visa</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NSE/RELIANCE" className="underline">Reliance</Link>
        </div>
      </div>

      <h2 className="mt-8">Further reading</h2>
      <ul>
        <li>
          Altman, E. (1968). <i>Financial Ratios, Discriminant Analysis and the
          Prediction of Corporate Bankruptcy.</i> Journal of Finance, 23(4).
        </li>
        <li>
          Altman, E. (2000). <i>Predicting Financial Distress of Companies:
          Revisiting the Z-Score and ZETA Models.</i> NYU Stern working paper.
        </li>
      </ul>
    </article>
  );
}
