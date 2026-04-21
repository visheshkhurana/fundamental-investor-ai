import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Peter Lynch's PEG ratio — Fundamental Investor AI",
  description:
    "Why a P/E of 30 can be cheaper than a P/E of 10. Lynch's PEG ratio explained, its limits, and how to use it without getting burned.",
};

export default function PEG() {
  return (
    <article className="max-w-2xl mx-auto prose prose-slate">
      <Link href="/learn" className="no-underline text-xs text-foreground/60">
        ← Back to Learn
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">Peter Lynch's PEG ratio</h1>
      <p className="text-foreground/60 text-sm mt-0">
        Why a P/E of 30 can be cheaper than a P/E of 10.
      </p>

      <h2 className="mt-8">The one-minute version</h2>
      <p>
        Peter Lynch ran Fidelity's Magellan Fund from 1977 to 1990 and delivered
        a 29.2% annual return. He was famously skeptical of static P/E
        comparisons: a fast-growing 30-P/E business can be cheaper than a
        stagnant 10-P/E business. His ratio — the PEG — makes that
        comparison explicit.
      </p>
      <p>
        <b>PEG = P/E ÷ annual earnings growth rate (as a percent).</b>
      </p>
      <p>
        A stock with a P/E of 20 and 25% earnings growth has a PEG of 0.80.
        A stock with a P/E of 15 and 5% earnings growth has a PEG of 3.00.
        The first stock is materially cheaper on this basis, even though its
        headline P/E is higher.
      </p>

      <h2 className="mt-8">How to read the number</h2>
      <ul>
        <li>
          <b>PEG &lt; 1.0</b> — often attractive. Growth is being underpaid for.
        </li>
        <li>
          <b>1.0 ≤ PEG &lt; 2.0</b> — fairly valued. Growth is being paid for,
          not discounted.
        </li>
        <li>
          <b>PEG &gt; 2.0</b> — expensive. Market is pricing in growth that may
          not materialize.
        </li>
      </ul>

      <h2 className="mt-8">Where PEG is useful</h2>
      <p>
        PEG works best when:
      </p>
      <ul>
        <li>
          The company has a <b>stable, predictable growth rate</b> (not cyclical
          or wildly accelerating).
        </li>
        <li>
          You're comparing stocks <b>within the same sector</b>. PEG across
          sectors can mislead — a utility's PEG of 2 means something different
          from a software company's PEG of 2.
        </li>
        <li>
          Earnings are <b>positive</b>. PEG with negative earnings is
          meaningless (though some analysts substitute revenue growth for
          early-stage firms).
        </li>
      </ul>

      <h2 className="mt-8">Where PEG breaks</h2>
      <ul>
        <li>
          <b>Growth rate choice.</b> Trailing growth? Forward analyst estimate?
          Self-estimated long-term rate? Each gives a different PEG. Yahoo's
          PEG uses forward 5-year consensus growth, which can be too
          optimistic.
        </li>
        <li>
          <b>Cyclical firms.</b> A steel company at the top of the cycle with
          40% earnings growth and P/E 8 has a PEG of 0.2 — which looks like a
          screaming bargain and usually isn't.
        </li>
        <li>
          <b>Low-growth quality.</b> Mature, high-ROIC franchises often show
          PEGs above 2. That's not always a sign of overvaluation — sometimes
          durability deserves a premium PEG.
        </li>
        <li>
          <b>Doesn't capture risk.</b> Two stocks with identical PEG can have
          wildly different risk profiles. PEG doesn't know about leverage,
          competitive dynamics, or moat durability.
        </li>
      </ul>

      <h2 className="mt-8">Lynch's own wisdom</h2>
      <p>
        Lynch treated PEG as a <i>first filter</i>, not a verdict. In <i>One Up
        on Wall Street</i> he was equally obsessed with qualitative signals:
        does the company have a niche? Is it in a dull industry with little
        analyst attention? Is management buying the stock? A low PEG on a
        great business was his setup; a low PEG on a mediocre one was a trap.
      </p>

      <h2 className="mt-8">How Fundamental Investor AI uses it</h2>
      <p>
        Every stock's PEG appears on its dashboard and in the screener. We use
        Yahoo's 5-year forward PEG where available, falling back to trailing
        when it's not. The <b>Lynch preset</b> in the screener surfaces
        PEG&nbsp;&lt;&nbsp;1 stocks with P/E&nbsp;&lt;&nbsp;30 — a pre-built
        "growth at a reasonable price" filter.
      </p>

      <div className="card p-5 not-prose mt-8 bg-white/5">
        <div className="font-semibold">Try the Lynch preset</div>
        <p className="text-sm text-foreground/70 mt-1">
          One-click filter for undervalued-growth candidates.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/screen?preset=lynch" className="underline">Lynch preset</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NSE/ICICIBANK" className="underline">ICICIBANK (PEG ~0.53)</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NSE/AXISBANK" className="underline">AXISBANK (PEG ~0.54)</Link>
        </div>
      </div>

      <h2 className="mt-8">Further reading</h2>
      <ul>
        <li>Lynch, P. (1989). <i>One Up on Wall Street.</i></li>
        <li>Lynch, P. (1993). <i>Beating the Street.</i></li>
      </ul>
    </article>
  );
}
