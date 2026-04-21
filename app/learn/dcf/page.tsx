import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DCF fair value for the rest of us — Fundamental Investor AI",
  description:
    "The two-stage discounted cashflow model in plain English. The math, the assumptions that matter, and why your answer is usually wrong in a useful way.",
};

export default function DCF() {
  return (
    <article className="max-w-2xl mx-auto prose prose-slate">
      <Link href="/learn" className="no-underline text-xs text-foreground/60">
        ← Back to Learn
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">DCF fair value for the rest of us</h1>
      <p className="text-foreground/60 text-sm mt-0">
        The two-stage discounted cashflow model, explained without the
        spreadsheet theater.
      </p>

      <h2 className="mt-8">The big idea</h2>
      <p>
        A company's intrinsic value is the sum of all the cash it will generate
        from today until the end of time, each future dollar discounted back to
        today because a dollar next year is worth less than a dollar now.
      </p>
      <p>
        That's the entire concept. Every Excel model, every equity research
        report, every valuation debate — all elaborations on that one idea.
      </p>

      <h2 className="mt-8">Why "two-stage"</h2>
      <p>
        A real business can't grow faster than GDP forever. If it could, it
        would eventually become bigger than GDP, which is mathematically
        impossible. So DCF models split the future into two stages:
      </p>
      <ul>
        <li>
          <b>Explicit period</b> (usually 5–10 years): cash flows grow at a
          higher, company-specific rate. You project them year by year.
        </li>
        <li>
          <b>Terminal value</b>: after the explicit period, growth drops to a
          sustainable perpetual rate (typically 2–4%, roughly long-run GDP +
          inflation). You collapse all cash flows from that point onward into a
          single lump-sum using the Gordon Growth formula.
        </li>
      </ul>

      <h2 className="mt-8">The math, once</h2>
      <pre className="bg-white/5 rounded p-4 text-xs">
{`Explicit:   Σ  FCF_year / (1 + r)^year       for year = 1 to N
Terminal:   [ FCF_N × (1 + g) / (r − g) ] / (1 + r)^N
Fair value: Explicit + Terminal − Net debt`}
      </pre>
      <p>Where:</p>
      <ul>
        <li><b>FCF</b> = free cash flow (operating cash flow minus capex)</li>
        <li><b>r</b> = discount rate (typically 8–12% for equity; higher for riskier firms)</li>
        <li><b>g</b> = terminal growth rate (typically 2.5–3.5%)</li>
        <li><b>N</b> = length of the explicit period (we use 10 years)</li>
      </ul>

      <h2 className="mt-8">The three assumptions that matter</h2>
      <p>
        DCF models look precise. They are not. The output is an illusion of
        certainty built on three very uncertain inputs:
      </p>
      <ol>
        <li>
          <b>The growth rate.</b> A 3-point change in your 10-year growth rate
          can change fair value by 50%+. Be conservative — it's hard to grow
          fast for a decade.
        </li>
        <li>
          <b>The discount rate.</b> Usually the cost of equity capital, often
          estimated via the CAPM model using beta. A stock's "right" discount
          rate is also conveniently hard to pin down.
        </li>
        <li>
          <b>The terminal growth rate.</b> This single number dominates the
          terminal value, which is typically 60–80% of total DCF value. Using
          4% vs 2% can double your answer.
        </li>
      </ol>

      <h2 className="mt-8">Why your answer is wrong in a useful way</h2>
      <p>
        Any DCF answer is a range. A point estimate like "fair value = $182"
        is a conversation starter, not a conclusion. The two useful questions
        are:
      </p>
      <ul>
        <li>
          <b>Is the current price meaningfully above or below my best-case DCF?</b>
          If the stock trades at a 40% discount to the midpoint of your
          defensible range, you have a margin of safety even if you're
          somewhat wrong.
        </li>
        <li>
          <b>What does the market need to believe for today's price to be fair?</b>
          Back-solving a DCF from the current price tells you the growth and
          margin expectations embedded in it. That's often more useful than
          computing your own number.
        </li>
      </ul>

      <h2 className="mt-8">Where DCF breaks</h2>
      <ul>
        <li>
          <b>Negative or erratic free cash flow.</b> Early-stage or heavily
          reinvesting companies can't be DCF'd without heroic assumptions. Use
          alternatives (reverse DCF, SOTP, multiples).
        </li>
        <li>
          <b>Financials.</b> Banks and insurers have different cash flow
          dynamics; use dividend-discount or residual-income models instead.
        </li>
        <li>
          <b>Commodity cyclicals.</b> Operating cash flow in the peak of a
          cycle is misleading. Normalize over a full cycle.
        </li>
        <li>
          <b>Tech with massive stock-based compensation.</b> SBC is a real
          cost even though it doesn't show in operating cash flow. Subtract it
          or you'll systematically overvalue.
        </li>
      </ul>

      <h2 className="mt-8">How Fundamental Investor AI uses it</h2>
      <p>
        Our DCF is deliberately conservative: 10-year explicit period, discount
        rate 10%, terminal growth 3%, and a growth rate inferred from actual
        earnings/revenue growth (capped 2–18% to prevent heroic assumptions).
        We compare the resulting per-share fair value to the current market
        price and report the margin of safety — positive means undervalued,
        negative means overvalued.
      </p>
      <p>
        If the DCF output is wildly off current price (ratio outside 0.2×–5×),
        we suppress it and show "—", because that's the model telling you it
        can't value this particular business. Don't fight the model on banks
        and early-stage tech.
      </p>

      <div className="card p-5 not-prose mt-8 bg-white/5">
        <div className="font-semibold">See DCF output live</div>
        <p className="text-sm text-foreground/70 mt-1">
          Open any mature profitable company. The DCF panel shows fair value,
          margin of safety, and the exact assumptions used.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/s/NASDAQ/AAPL" className="underline">AAPL</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NASDAQ/MSFT" className="underline">MSFT</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NSE/TCS" className="underline">TCS</Link>
        </div>
      </div>

      <h2 className="mt-8">Further reading</h2>
      <ul>
        <li>
          Damodaran, A. <i>Investment Valuation.</i> The definitive reference.
        </li>
        <li>
          Greenwald, B. <i>Value Investing: From Graham to Buffett and Beyond.</i>
        </li>
        <li>
          Mauboussin, M. <i>Expectations Investing.</i> Covers reverse DCF
          elegantly.
        </li>
      </ul>
    </article>
  );
}
