import Link from "next/link";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock, type Category } from "@/lib/scoring";
import { fmtCurrencyPrice, fmtMoney, fmtPct, verdictChip, verdictLabel } from "@/lib/fmt";
import ScoreBadge from "@/components/ScoreBadge";
import CategoryCard from "@/components/CategoryCard";
import AdvancedPanel from "@/components/AdvancedPanel";
import EntryExitPanel from "@/components/EntryExitPanel";
import PortfolioButton from "@/components/PortfolioButton";
import WatchButton from "@/components/WatchButton";
import TradeModal from "@/components/TradeModal";
import PriceChart from "@/components/PriceChart";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function StockPage({
  params,
}: {
  params: { market: string; symbol: string };
}) {
  const market = params.market.toUpperCase();
  const symbol = params.symbol.toUpperCase();

  const [quote, fund] = await Promise.all([
    fetchQuote(market, symbol),
    fetchFundamentals(market, symbol),
  ]);

  if (!fund) {
    return (
      <div className="py-20 text-center">
        <div className="text-2xl font-semibold mb-2">Couldn't load {symbol}</div>
        <p className="text-foreground/60 max-w-lg mx-auto">
          Yahoo Finance may be rate-limiting us, or the ticker may not exist on {market}.
          Try again in a minute, or check spelling.
        </p>
        <Link href="/" className="underline mt-4 inline-block">
          ← Back to search
        </Link>
      </div>
    );
  }

  const score = scoreStock(fund, quote?.price ?? null);
  const change =
    quote && quote.price && quote.prevClose
      ? (quote.price - quote.prevClose) / quote.prevClose
      : null;

  const categoryWeights = score.weights;
  const grouped: Record<Category, typeof score.items> = {
    macro: [],
    industry: [],
    company: [],
    valuation: [],
    triggers: [],
  };
  for (const it of score.items) grouped[it.category].push(it);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="text-xs text-foreground/60">
            {market} · {fund.sector ?? "—"}
            {fund.industry ? ` · ${fund.industry}` : ""}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">
            {quote?.name ?? fund.symbol}
          </h1>
          <div className="text-sm text-foreground/70 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className="font-semibold text-foreground">
              {fmtCurrencyPrice(quote?.price ?? null, quote?.currency)}
            </span>
            {change != null && (
              <span className={change >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {change >= 0 ? "+" : ""}
                {(change * 100).toFixed(2)}% today
              </span>
            )}
            <span className="text-foreground/60">
              Mkt cap {fmtMoney(fund.marketCap, fund.currency)}
            </span>
            {fund.peTrailing && (
              <span className="text-foreground/60">P/E {fund.peTrailing.toFixed(1)}</span>
            )}
            {quote?.yearLow && quote?.yearHigh && (
              <span className="text-foreground/60">
                52w {fmtCurrencyPrice(quote.yearLow, quote.currency)}–
                {fmtCurrencyPrice(quote.yearHigh, quote.currency)}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <ScoreBadge total={score.total} verdict={score.verdict} size="lg" />
          <div className="flex gap-2">
            <TradeModal
              market={market}
              symbol={symbol}
              name={quote?.name ?? null}
              price={quote?.price ?? null}
              currency={fund.currency}
            />
            <WatchButton market={market} symbol={symbol} name={quote?.name ?? null} />
            <PortfolioButton
              market={market}
              symbol={symbol}
              name={quote?.name ?? null}
              currency={fund.currency}
              score={score.total}
              verdict={score.verdict}
            />
            <Link
              href={`/assistant?m=${market}&s=${symbol}`}
              className="border border-white/15 rounded px-3 py-1.5 text-xs"
            >
              Ask AI →
            </Link>
            <Link
              href={`/compare?a=${market}/${symbol}&b=${market === "NSE" || market === "BSE" ? "NSE/INFY" : "NASDAQ/MSFT"}`}
              className="border border-white/15 rounded px-3 py-1.5 text-xs"
            >
              Compare →
            </Link>
          </div>
        </div>
      </div>

      {/* Scorecard strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(categoryWeights) as Category[]).map((cat) => (
          <div key={cat} className="card p-3">
            <div className="text-xs text-foreground/60 capitalize">
              {cat} · {Math.round(categoryWeights[cat] * 100)}%
            </div>
            <div className="text-2xl font-bold mt-0.5">{score.byCategory[cat].toFixed(1)}</div>
            <div className="text-[11px] text-foreground/40">
              contributes {(score.byCategory[cat] * categoryWeights[cat]).toFixed(2)} pts
            </div>
          </div>
        ))}
      </div>

      {/* Price chart */}
      <PriceChart market={market} symbol={symbol} />

      {/* Entry / Exit signals */}
      <EntryExitPanel market={market} symbol={symbol} score={score} />

      {/* Advanced signals */}
      <AdvancedPanel score={score} currency={fund.currency} />

      {/* Per-category detail */}
      <div className="grid md:grid-cols-2 gap-4">
        <CategoryCard
          category="macro"
          weight={categoryWeights.macro}
          score={score.byCategory.macro}
          items={grouped.macro}
        />
        <CategoryCard
          category="industry"
          weight={categoryWeights.industry}
          score={score.byCategory.industry}
          items={grouped.industry}
        />
        <CategoryCard
          category="company"
          weight={categoryWeights.company}
          score={score.byCategory.company}
          items={grouped.company}
        />
        <CategoryCard
          category="valuation"
          weight={categoryWeights.valuation}
          score={score.byCategory.valuation}
          items={grouped.valuation}
        />
        <CategoryCard
          category="triggers"
          weight={categoryWeights.triggers}
          score={score.byCategory.triggers}
          items={grouped.triggers}
        />
      </div>

      {/* Business summary */}
      {fund.longBusinessSummary && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold">Business summary</summary>
          <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
            {fund.longBusinessSummary}
          </p>
        </details>
      )}

      {/* Sources */}
      <div className="text-xs text-foreground/40">
        Data: Yahoo Finance (unofficial) · cached 4h for fundamentals, 60s for quotes. Analysis
        frameworks: Piotroski (2000), Altman (1968), Dorsey's moat classification, Buffett owner
        earnings, Lynch PEG heuristic.
      </div>
    </div>
  );
}
