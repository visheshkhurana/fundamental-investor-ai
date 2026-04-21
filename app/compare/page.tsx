import Link from "next/link";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock, type Category, type ScoreResult } from "@/lib/scoring";
import { fmtCurrencyPrice, fmtMoney, fmtPct, verdictChip, verdictLabel } from "@/lib/fmt";
import ScoreBadge from "@/components/ScoreBadge";
import CompareInput from "@/components/CompareInput";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StockBundle = {
  market: string;
  symbol: string;
  quote: Awaited<ReturnType<typeof fetchQuote>>;
  fund: NonNullable<Awaited<ReturnType<typeof fetchFundamentals>>> | null;
  score: ScoreResult | null;
};

async function loadSide(spec: string): Promise<StockBundle | null> {
  const [market, symbol] = spec.split("/").map((s) => s?.toUpperCase().trim());
  if (!market || !symbol) return null;
  const [quote, fund] = await Promise.all([
    fetchQuote(market, symbol),
    fetchFundamentals(market, symbol),
  ]);
  if (!fund) return { market, symbol, quote, fund: null, score: null };
  const score = scoreStock(fund, quote?.price ?? null);
  return { market, symbol, quote, fund, score };
}

function arrow(a: number | null | undefined, b: number | null | undefined) {
  if (a == null || b == null) return <span className="text-foreground/30">—</span>;
  if (Math.abs(a - b) / Math.max(Math.abs(a), 0.0001) < 0.02) return <span className="text-foreground/40">≈</span>;
  return a > b ? <span className="text-emerald-600">◄</span> : <span className="text-emerald-600">►</span>;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const a = searchParams.a ?? "NSE/RELIANCE";
  const b = searchParams.b ?? "NSE/INFY";

  const [sa, sb] = await Promise.all([loadSide(a), loadSide(b)]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Head-to-head</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Same framework, two stocks. Every metric lined up so the differences are obvious.
          </p>
        </div>
        <CompareInput defaultA={a} defaultB={b} />
      </div>

      {(!sa || !sb) && (
        <div className="card p-6 text-sm">
          Specify both sides as <code>?a=MARKET/SYMBOL&b=MARKET/SYMBOL</code>. Example:{" "}
          <Link className="underline" href="/compare?a=NASDAQ/AAPL&b=NASDAQ/MSFT">
            AAPL vs MSFT
          </Link>
          .
        </div>
      )}

      {sa && sb && sa.score && sb.score && sa.fund && sb.fund && (
        <>
          {/* Header row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SideHeader bundle={sa} />
            <SideHeader bundle={sb} />
          </div>

          {/* Verdict banner */}
          <VerdictBanner a={sa} b={sb} />

          {/* Category bars */}
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-foreground/40 mb-3">
              Category breakdown
            </div>
            <div className="space-y-3">
              {(Object.keys(sa.score.weights) as Category[]).map((cat) => (
                <CategoryRow
                  key={cat}
                  cat={cat}
                  weight={sa.score!.weights[cat]}
                  a={sa.score!.byCategory[cat]}
                  b={sb.score!.byCategory[cat]}
                  aLabel={sa.symbol}
                  bLabel={sb.symbol}
                />
              ))}
            </div>
          </div>

          {/* Metrics table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
                <tr>
                  <th className="px-4 py-2">Metric</th>
                  <th className="px-4 py-2 text-right">{sa.symbol}</th>
                  <th className="px-4 py-2 text-center w-12"></th>
                  <th className="px-4 py-2 text-right">{sb.symbol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <Row label="Revenue growth YoY" a={sa.fund.revenueGrowth} b={sb.fund.revenueGrowth} fmt={fmtPct} />
                <Row label="Operating margin" a={sa.fund.operatingMargin} b={sb.fund.operatingMargin} fmt={fmtPct} />
                <Row label="Profit margin" a={sa.fund.profitMargin} b={sb.fund.profitMargin} fmt={fmtPct} />
                <Row label="ROE" a={sa.fund.roe} b={sb.fund.roe} fmt={fmtPct} />
                <Row label="ROA" a={sa.fund.roa} b={sb.fund.roa} fmt={fmtPct} />
                <Row label="Debt / Equity" a={sa.fund.debtToEquity} b={sb.fund.debtToEquity} fmt={(v)=>v==null?"—":(v/100).toFixed(2)} higherIsBetter={false} />
                <Row label="P/E trailing" a={sa.fund.peTrailing} b={sb.fund.peTrailing} fmt={(v)=>v==null?"—":v.toFixed(1)} higherIsBetter={false} />
                <Row label="PEG (Lynch)" a={sa.score.advanced.lynchPEG.peg} b={sb.score.advanced.lynchPEG.peg} fmt={(v)=>v==null?"—":v.toFixed(2)} higherIsBetter={false} />
                <Row label="EV / EBITDA" a={sa.fund.evToEbitda} b={sb.fund.evToEbitda} fmt={(v)=>v==null?"—":v.toFixed(1)} higherIsBetter={false} />
                <Row label="P/B" a={sa.fund.priceToBook} b={sb.fund.priceToBook} fmt={(v)=>v==null?"—":v.toFixed(2)} higherIsBetter={false} />
                <Row label="Piotroski F-Score" a={sa.score.advanced.piotroski.score} b={sb.score.advanced.piotroski.score} fmt={(v)=>v==null?"—":`${v}/9`} />
                <Row label="Altman Z-Score" a={sa.score.advanced.altmanZ.score} b={sb.score.advanced.altmanZ.score} fmt={(v)=>v==null?"—":v.toFixed(2)} />
                <Row label="Market cap" a={sa.fund.marketCap} b={sb.fund.marketCap} fmt={(v)=>fmtMoney(v, sa.fund!.currency)} />
                <Row label="Free cash flow" a={sa.fund.freeCashflow} b={sb.fund.freeCashflow} fmt={(v)=>fmtMoney(v, sa.fund!.currency)} />
                <Row label="DCF fair value" a={sa.score.advanced.dcf.fairValue} b={sb.score.advanced.dcf.fairValue} fmt={(v)=>v==null?"—":v.toFixed(2)} />
                <Row label="DCF margin of safety" a={sa.score.advanced.dcf.marginOfSafety} b={sb.score.advanced.dcf.marginOfSafety} fmt={fmtPct} />
                <TextRow label="Moat type" a={sa.score.advanced.moat.type.replace(/_/g,' ')} b={sb.score.advanced.moat.type.replace(/_/g,' ')} />
                <TextRow label="Moat strength" a={sa.score.advanced.moat.strength} b={sb.score.advanced.moat.strength} />
                <TextRow label="Analyst consensus" a={sa.fund.recommendationKey ?? "—"} b={sb.fund.recommendationKey ?? "—"} />
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href={`/assistant?m=${sa.market}&s=${sa.symbol}&cm=${sb.market}&cs=${sb.symbol}`}
              className="bg-white/[0.04] text-white text-sm rounded px-4 py-2"
            >
              Ask AI: which is the better long-term hold?
            </Link>
            <Link href={`/s/${sa.market}/${sa.symbol}`} className="border border-white/15 rounded px-4 py-2 text-sm">
              {sa.symbol} dashboard
            </Link>
            <Link href={`/s/${sb.market}/${sb.symbol}`} className="border border-white/15 rounded px-4 py-2 text-sm">
              {sb.symbol} dashboard
            </Link>
          </div>
        </>
      )}

      {/* Popular comparisons */}
      <div className="card p-5">
        <div className="text-xs uppercase tracking-wide text-foreground/40 mb-3">
          Popular comparisons
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            ["NASDAQ/AAPL","NASDAQ/MSFT","AAPL vs MSFT"],
            ["NASDAQ/NVDA","NASDAQ/AMD","NVDA vs AMD"],
            ["NSE/HDFCBANK","NSE/ICICIBANK","HDFC Bank vs ICICI"],
            ["NSE/TCS","NSE/INFY","TCS vs INFY"],
            ["NSE/RELIANCE","NSE/BHARTIARTL","RELIANCE vs AIRTEL"],
            ["NYSE/V","NYSE/MA","Visa vs Mastercard"],
            ["NASDAQ/GOOGL","NASDAQ/META","GOOGL vs META"],
            ["NSE/MARUTI","NSE/TATAMOTORS","Maruti vs Tata Motors"],
          ].map(([a,b,label])=>(
            <Link key={label} href={`/compare?a=${a}&b=${b}`} className="border border-white/10 rounded-full px-3 py-1 hover:bg-white/5">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SideHeader({ bundle }: { bundle: StockBundle }) {
  if (!bundle.fund || !bundle.score)
    return (
      <div className="card p-5">
        <div className="text-xs text-foreground/60">{bundle.market}</div>
        <div className="text-xl font-bold">{bundle.symbol}</div>
        <div className="text-sm text-rose-500 mt-2">Couldn't load fundamentals.</div>
      </div>
    );
  return (
    <div className="card p-5">
      <div className="text-xs text-foreground/60">
        {bundle.market} · {bundle.fund.sector ?? "—"}
      </div>
      <div className="flex items-start justify-between gap-3 mt-1">
        <div>
          <div className="text-xl font-bold">
            {bundle.quote?.name ?? bundle.symbol}
          </div>
          <div className="text-sm text-foreground/70 mt-0.5">
            {fmtCurrencyPrice(bundle.quote?.price ?? null, bundle.quote?.currency)} ·{" "}
            {fmtMoney(bundle.fund.marketCap, bundle.fund.currency)} mcap
          </div>
        </div>
        <ScoreBadge total={bundle.score.total} verdict={bundle.score.verdict} size="md" />
      </div>
    </div>
  );
}

function VerdictBanner({ a, b }: { a: StockBundle; b: StockBundle }) {
  if (!a.score || !b.score) return null;
  const diff = a.score.total - b.score.total;
  const winner = Math.abs(diff) < 0.3 ? null : diff > 0 ? a : b;
  const loser = winner === a ? b : a;

  if (!winner || !loser) {
    return (
      <div className="card p-4 bg-white/5 text-sm">
        <b>It's a tie.</b> {a.symbol} and {b.symbol} both score within 0.3 points on this framework —
        decide based on which thesis you prefer.
      </div>
    );
  }

  return (
    <div className="card p-4 bg-emerald-500/10 border-emerald-500/20 text-sm">
      <b>{winner.symbol}</b> edges out <b>{loser.symbol}</b> by{" "}
      <b>{Math.abs(diff).toFixed(2)}</b> points on the composite score
      ({winner.score!.total.toFixed(2)} vs {loser.score!.total.toFixed(2)}).
      The bigger the gap, the clearer the call.
    </div>
  );
}

function CategoryRow({
  cat,
  weight,
  a,
  b,
  aLabel,
  bLabel,
}: {
  cat: string;
  weight: number;
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
}) {
  const aPct = (a / 10) * 100;
  const bPct = (b / 10) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-foreground/60 mb-1">
        <span className="capitalize">
          {cat} <span className="text-foreground/40">· {Math.round(weight * 100)}%</span>
        </span>
        <span>
          <span className={a >= b ? "font-semibold text-foreground" : ""}>
            {aLabel} {a.toFixed(1)}
          </span>{" "}
          ·{" "}
          <span className={b >= a ? "font-semibold text-foreground" : ""}>
            {bLabel} {b.toFixed(1)}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 flex flex-row-reverse">
          <div className="h-2 bg-white/[0.04] rounded-full" style={{ width: `${aPct}%` }} />
          <div className="h-2 bg-white/10 rounded-full flex-1" />
        </div>
        <div className="w-1 h-3 bg-white/20 rounded-full" />
        <div className="flex-1 flex">
          <div className="h-2 bg-white/[0.04] rounded-full" style={{ width: `${bPct}%` }} />
          <div className="h-2 bg-white/10 rounded-full flex-1" />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  a,
  b,
  fmt,
  higherIsBetter = true,
}: {
  label: string;
  a: number | null | undefined;
  b: number | null | undefined;
  fmt: (v: number | null | undefined) => string;
  higherIsBetter?: boolean;
}) {
  const aWins =
    a != null && b != null && (higherIsBetter ? a > b : a < b);
  const bWins =
    a != null && b != null && (higherIsBetter ? b > a : b < a);
  return (
    <tr>
      <td className="px-4 py-2 text-foreground/70">{label}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${aWins ? "font-semibold text-emerald-300" : ""}`}>{fmt(a)}</td>
      <td className="px-4 py-2 text-center">{arrow(higherIsBetter?a:b, higherIsBetter?b:a)}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${bWins ? "font-semibold text-emerald-300" : ""}`}>{fmt(b)}</td>
    </tr>
  );
}

function TextRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td className="px-4 py-2 text-foreground/70">{label}</td>
      <td className="px-4 py-2 text-right capitalize">{a}</td>
      <td className="px-4 py-2 text-center text-foreground/30">—</td>
      <td className="px-4 py-2 text-right capitalize">{b}</td>
    </tr>
  );
}
