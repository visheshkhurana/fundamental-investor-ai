export const metadata = { title: "About · Fundamental Investor AI" };

export default function About() {
  return (
    <div className="max-w-2xl mx-auto prose prose-slate text-sm">
      <h1 className="text-2xl font-bold">About this app</h1>
      <p>
        Fundamental Investor AI is a research tool for long-term, fundamentals-driven equity
        investors. It grades any stock on the same framework every time: macro → industry →
        company → valuation → triggers, weighted <b>10/20/40/20/10</b>.
      </p>

      <h2 className="font-semibold text-base mt-5">What's in the score</h2>
      <p>18 checklist items drawn from a few frameworks I trust:</p>
      <ul className="list-disc list-inside space-y-1">
        <li>
          <b>Buffett's owner earnings</b> — positive FCF, ROE &gt; 15%, reasonable D/E.
        </li>
        <li>
          <b>Pat Dorsey's 5 moat sources</b> — network effects, switching costs, intangibles
          (brand/patents), scale cost advantages, regulatory moats.
        </li>
        <li>
          <b>Joseph Piotroski's F-Score (2000)</b> — a 9-point binary score for financial strength.
        </li>
        <li>
          <b>Edward Altman's Z-Score (1968)</b> — bankruptcy probability, approximated.
        </li>
        <li>
          <b>Peter Lynch's PEG heuristic</b> — &lt;1 is often cheap, &gt;2 is often rich.
        </li>
        <li>
          <b>Two-stage DCF</b> with conservative defaults (10% discount rate, 3% terminal growth)
          to compute a fair value and margin of safety.
        </li>
      </ul>

      <h2 className="font-semibold text-base mt-5">What it's NOT</h2>
      <ul className="list-disc list-inside space-y-1">
        <li>Not investment advice. Not a broker. Not a signal bot.</li>
        <li>
          Not a day-trading tool. The scoring is tuned for multi-year holding periods, not
          momentum.
        </li>
        <li>Not audited. Data comes from Yahoo Finance's undocumented API — quality varies.</li>
      </ul>

      <h2 className="font-semibold text-base mt-5">Data & refresh</h2>
      <p>
        Live quotes are fetched on demand and cached 60 seconds. Fundamentals are cached 4 hours
        per ticker. Both come from Yahoo Finance's unofficial endpoints. If Yahoo rate-limits,
        dashboards may fail briefly — retry in a minute.
      </p>

      <h2 className="font-semibold text-base mt-5">Open questions you should ask</h2>
      <p>
        Even a 9/10 stock can be a bad investment if the world changes. Before buying:
      </p>
      <ul className="list-disc list-inside space-y-1">
        <li>What breaks the moat? (New tech, regulation, capital cycles)</li>
        <li>What's already priced in? (Compare forward P/E to 10y median)</li>
        <li>What's management's track record on capital allocation?</li>
        <li>What's the tail risk — leverage, concentration, accounting oddities?</li>
      </ul>
      <p className="text-xs text-foreground/40 mt-6">
        Disclaimer: This is research tooling only. Consult a SEBI-registered (India) or
        SEC-registered (US) advisor before acting on any analysis here.
      </p>
    </div>
  );
}
