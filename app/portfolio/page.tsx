"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Position = {
  market: string;
  symbol: string;
  name?: string | null;
  qty: number;
  avgCost: number;
  currency: string | null;
  score?: number;
  verdict?: string;
  addedAt: string;
};

const KEY = "fi.portfolio.v1";

export default function PortfolioPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [live, setLive] = useState<Record<string, { price: number | null; score: number; verdict: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem(KEY) || "[]");
    setPositions(p);
    // Refresh live data
    Promise.all(
      p.map(async (pos: Position) => {
        try {
          const r = await fetch(`/api/stock/${pos.market}/${pos.symbol}`);
          if (!r.ok) return;
          const j = await r.json();
          setLive((prev) => ({
            ...prev,
            [`${pos.market}-${pos.symbol}`]: {
              price: j.quote?.price ?? null,
              score: j.score?.total ?? pos.score ?? 0,
              verdict: j.score?.verdict ?? pos.verdict ?? "hold",
            },
          }));
        } catch {}
      })
    ).finally(() => setLoading(false));
  }, []);

  const remove = (m: string, s: string) => {
    const next = positions.filter((p) => !(p.market === m && p.symbol === s));
    setPositions(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  if (positions.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="text-2xl font-semibold mb-2">No positions yet</div>
        <p className="text-foreground/60 max-w-md mx-auto mb-6">
          Search a stock, open its dashboard, and click "Add to portfolio" to track its score over
          time.
        </p>
        <Link href="/" className="bg-white/[0.04] text-white rounded-lg px-4 py-2 inline-block">
          Find a stock →
        </Link>
      </div>
    );
  }

  const totalValue = positions.reduce((sum, p) => {
    const key = `${p.market}-${p.symbol}`;
    const price = live[key]?.price ?? p.avgCost;
    // Not FX-converting in MVP — show per-currency subtotals below
    return sum + price * p.qty;
  }, 0);

  const portfolioScore =
    positions.reduce((acc, p) => {
      const key = `${p.market}-${p.symbol}`;
      const score = live[key]?.score ?? p.score ?? 0;
      const weight = (live[key]?.price ?? p.avgCost) * p.qty;
      return acc + score * weight;
    }, 0) / Math.max(totalValue, 1);

  const flagged = positions.filter((p) => {
    const s = live[`${p.market}-${p.symbol}`]?.score ?? p.score ?? 0;
    return s < 5;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        {loading && (
          <span className="text-xs text-foreground/40">Refreshing live scores…</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Positions" value={positions.length.toString()} />
        <Stat
          label="Weighted score"
          value={portfolioScore.toFixed(2)}
          hint={portfolioScore >= 6 ? "Buy-quality" : portfolioScore >= 4 ? "Mixed" : "Weak"}
        />
        <Stat
          label="Flagged (score < 5)"
          value={flagged.length.toString()}
          tone={flagged.length > 0 ? "bad" : "ok"}
        />
        <Stat label="Markets" value={new Set(positions.map((p) => p.market)).size.toString()} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
            <tr>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Market</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Avg buy</th>
              <th className="px-4 py-2 text-right">Now</th>
              <th className="px-4 py-2 text-right">P/L</th>
              <th className="px-4 py-2 text-right">Score</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((p) => {
              const key = `${p.market}-${p.symbol}`;
              const now = live[key]?.price ?? null;
              const score = live[key]?.score ?? p.score ?? 0;
              const pnl = now != null ? ((now - p.avgCost) / p.avgCost) * 100 : null;
              const flag = score < 5;
              return (
                <tr key={key} className={flag ? "bg-rose-500/10" : ""}>
                  <td className="px-4 py-2">
                    <Link href={`/s/${p.market}/${p.symbol}`} className="font-medium hover:underline">
                      {p.symbol}
                    </Link>
                    {p.name && <div className="text-xs text-foreground/60 truncate max-w-[18ch]">{p.name}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground/60">{p.market}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.qty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {p.currency === "INR" ? "₹" : "$"}
                    {p.avgCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {now != null ? `${p.currency === "INR" ? "₹" : "$"}${now.toFixed(2)}` : "—"}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular-nums ${
                      pnl == null ? "" : pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {pnl != null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span
                      className={`chip ${
                        score >= 8
                          ? "chip-strong"
                          : score >= 6
                            ? "chip-buy"
                            : score >= 4
                              ? "chip-hold"
                              : "chip-avoid"
                      }`}
                    >
                      {score.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(p.market, p.symbol)}
                      className="text-xs text-foreground/40 hover:text-rose-500"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-foreground/40">
        Portfolio stored locally in your browser — no server record until accounts ship. Live scores
        refresh from the same framework used on stock dashboards.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "bad";
}) {
  return (
    <div className="card p-4">
      <div className="text-xs text-foreground/60">{label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${tone === "bad" ? "text-rose-600" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-foreground/60 mt-0.5">{hint}</div>}
    </div>
  );
}
