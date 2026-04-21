import type { ScoreResult } from "@/lib/scoring";
import { fmtCurrencyPrice, fmtMoney } from "@/lib/fmt";

// A miniature, faithful render of a stock dashboard — used as the 3D-perspective
// product showcase inside the hero. Reuses the live score of whatever stock
// the homepage resolves (default: RELIANCE).
type Props = {
  market: string;
  symbol: string;
  name: string | null;
  price: number | null;
  prevClose?: number | null;
  currency: string | null;
  mcap: number | null;
  score: ScoreResult;
};

const CAT_ICON: Record<string, string> = {
  macro: "🌍",
  industry: "🏭",
  company: "🏢",
  valuation: "💰",
  triggers: "🔔",
};

export default function HeroDashboardPreview({
  market,
  symbol,
  name,
  price,
  prevClose,
  currency,
  mcap,
  score,
}: Props) {
  const change =
    price != null && prevClose != null && prevClose > 0
      ? (price - prevClose) / prevClose
      : null;

  return (
    <div
      className="relative overflow-hidden border border-white/10 bg-[#010205] rounded-2xl w-full"
      style={{
        boxShadow:
          "inset 0 0 120px rgba(255,255,255,0.04), inset 0 0 60px rgba(255,255,255,0.03), inset 0 0 30px rgba(255,255,255,0.02)",
      }}
    >
      {/* Sidebar (hidden on mobile) */}
      <div className="flex h-[360px] md:h-[480px]">
        <div className="hidden md:flex w-48 flex-col border-r border-white/10 p-3 gap-1 bg-white/[0.02]">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-white/10">
            <div className="w-6 h-6 rounded bg-white/10 grid place-items-center text-xs">
              📈
            </div>
            <span className="text-sm font-semibold">Research</span>
          </div>
          {[
            "Search",
            "Curator",
            "Screener",
            "Compare",
            "Portfolio",
            "Trade",
            "Learn",
          ].map((l, i) => (
            <div
              key={l}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                i === 1 ? "bg-white/10 text-white" : "text-white/60"
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-current opacity-50" />
              {l}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0 p-4 md:p-6">
          {/* Breadcrumb-ish header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider text-white/40">
              {market} · {name?.split(" ").slice(-2).join(" ") ?? "Energy"}
            </div>
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/15" />
              <span className="w-2 h-2 rounded-full bg-white/15" />
              <span className="w-2 h-2 rounded-full bg-white/15" />
            </div>
          </div>

          {/* Title + price */}
          <div className="flex items-start justify-between gap-6 mb-4">
            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-bold tracking-tight">
                {symbol}
              </div>
              <div className="text-sm text-white/60 truncate">{name}</div>
              <div className="flex items-baseline gap-3 mt-2 text-sm">
                <span className="font-semibold text-white">
                  {fmtCurrencyPrice(price, currency)}
                </span>
                {change != null && (
                  <span
                    className={
                      change >= 0 ? "text-emerald-400" : "text-rose-400"
                    }
                  >
                    {change >= 0 ? "+" : ""}
                    {(change * 100).toFixed(2)}%
                  </span>
                )}
                <span className="text-white/50 text-xs">
                  Mcap {fmtMoney(mcap, currency)}
                </span>
              </div>
            </div>

            {/* Score badge */}
            <div className="flex flex-col items-end">
              <div className="text-[10px] uppercase tracking-wider text-white/40 mb-0.5">
                Score
              </div>
              <div className="text-4xl md:text-5xl font-bold leading-none tracking-tight">
                {score.total.toFixed(1)}
              </div>
              <span
                className={`mt-1 chip ${
                  score.verdict === "strong_buy"
                    ? "chip-strong"
                    : score.verdict === "buy"
                      ? "chip-buy"
                      : score.verdict === "hold"
                        ? "chip-hold"
                        : "chip-avoid"
                }`}
              >
                {score.verdict.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          </div>

          {/* Category bar strip */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {(Object.keys(score.weights) as (keyof typeof score.byCategory)[]).map(
              (cat) => {
                const s = score.byCategory[cat];
                return (
                  <div
                    key={cat}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-2"
                  >
                    <div className="flex items-center gap-1 text-[10px] text-white/50 capitalize mb-1">
                      <span>{CAT_ICON[cat]}</span>
                      <span>{cat.slice(0, 5)}</span>
                    </div>
                    <div className="text-sm font-bold">{s.toFixed(1)}</div>
                    <div className="h-1 mt-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-white/80"
                        style={{ width: `${(s / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Advanced signals strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <AdvTile
              label="Piotroski"
              value={`${score.advanced.piotroski.score}/9`}
              tone={score.advanced.piotroski.score >= 7 ? "good" : score.advanced.piotroski.score >= 4 ? "mid" : "bad"}
            />
            <AdvTile
              label="Altman Z"
              value={score.advanced.altmanZ.score?.toFixed(2) ?? "—"}
              tone={score.advanced.altmanZ.zone === "safe" ? "good" : score.advanced.altmanZ.zone === "distress" ? "bad" : "mid"}
            />
            <AdvTile
              label="Moat"
              value={score.advanced.moat.strength}
              tone={score.advanced.moat.strength === "wide" ? "good" : score.advanced.moat.strength === "narrow" ? "mid" : "bad"}
            />
            <AdvTile
              label="PEG"
              value={score.advanced.lynchPEG.peg?.toFixed(2) ?? "—"}
              tone={score.advanced.lynchPEG.verdict === "undervalued" ? "good" : score.advanced.lynchPEG.verdict === "fair" ? "mid" : "bad"}
            />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 md:h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #010205 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

function AdvTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "mid" | "bad";
}) {
  const dot =
    tone === "good"
      ? "bg-emerald-400"
      : tone === "bad"
        ? "bg-rose-400"
        : "bg-amber-400";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="text-sm font-semibold mt-1 capitalize">{value}</div>
    </div>
  );
}
