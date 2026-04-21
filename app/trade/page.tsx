"use client";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { tradingFetch } from "@/lib/clientId";
import PortfolioReviewButton from "@/components/PortfolioReviewButton";

type Position = {
  market: string;
  symbol: string;
  name: string | null;
  qty: number;
  avg_cost: number;
  currency: string;
  ltp: number | null;
  value: number | null;
  pnl: number | null;
  pnlPct: number | null;
};

type Order = {
  id: number;
  market: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  currency: string;
  total: number;
  executed_at: string;
  review?: { verdict: string | null; content: string } | null;
};

type Account = {
  summary: {
    cashInr: number;
    cashUsd: number;
    positionsValueInr: number;
    positionsValueUsd: number;
    totalInr: number;
    totalUsd: number;
  };
  positions: Position[];
  orders: Order[];
};

function sym(c: string) {
  return c === "INR" ? "₹" : "$";
}

function fmt(v: number | null, currency: string, digits = 2) {
  if (v == null) return "—";
  return `${sym(currency)}${v.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

export default function TradePage() {
  const [data, setData] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await tradingFetch("/api/trading/account");
        const j = await r.json();
        setData(j);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-foreground/60">Loading your paper account…</div>
    );
  }
  if (!data) {
    return (
      <div className="py-16 text-center">
        <div className="text-xl font-semibold mb-2">Couldn't load account</div>
        <Link className="underline" href="/">
          ← Back
        </Link>
      </div>
    );
  }

  const { summary, positions, orders } = data;

  // Compute starting-value diff (we don't persist starting balance separately; the defaults are 1M INR / 10K USD)
  const STARTING_INR = 1_000_000;
  const STARTING_USD = 10_000;
  const pnlInr = summary.totalInr - STARTING_INR;
  const pnlInrPct = pnlInr / STARTING_INR;
  const pnlUsd = summary.totalUsd - STARTING_USD;
  const pnlUsdPct = pnlUsd / STARTING_USD;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Paper trading</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Virtual cash. Live prices. Every buy/sell teaches you whether your score-based
            convictions survive the market.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PortfolioReviewButton />
          <div className="flex gap-4 text-xs">
            <Link href="/trade/leaderboard" className="underline text-foreground/60">
              Leaderboard →
            </Link>
            <Link href="/" className="underline text-foreground/60">
              Find stocks →
            </Link>
          </div>
        </div>
      </div>

      {/* Account summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <AccountCard
          label="India · INR"
          cash={summary.cashInr}
          positionsValue={summary.positionsValueInr}
          total={summary.totalInr}
          pnl={pnlInr}
          pnlPct={pnlInrPct}
          currency="INR"
        />
        <AccountCard
          label="United States · USD"
          cash={summary.cashUsd}
          positionsValue={summary.positionsValueUsd}
          total={summary.totalUsd}
          pnl={pnlUsd}
          pnlPct={pnlUsdPct}
          currency="USD"
        />
      </div>

      {/* Positions */}
      <section>
        <h2 className="text-sm uppercase tracking-wide text-foreground/40 mb-2">Positions</h2>
        {positions.length === 0 ? (
          <div className="card p-6 text-sm text-foreground/60">
            No positions yet. Find a stock and tap <b>Trade</b> on its dashboard to place your first order.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
                <tr>
                  <th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Avg cost</th>
                  <th className="px-4 py-2 text-right">LTP</th>
                  <th className="px-4 py-2 text-right">Value</th>
                  <th className="px-4 py-2 text-right">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {positions.map((p) => (
                  <tr key={`${p.market}-${p.symbol}`}>
                    <td className="px-4 py-2">
                      <Link
                        href={`/s/${p.market}/${p.symbol}`}
                        className="font-medium hover:underline"
                      >
                        {p.symbol}
                      </Link>
                      <div className="text-xs text-foreground/60 truncate max-w-[22ch]">{p.name}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {Number(p.qty).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmt(Number(p.avg_cost), p.currency)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmt(p.ltp, p.currency)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmt(p.value, p.currency, 0)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        p.pnl == null ? "" : p.pnl >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {p.pnl != null
                        ? `${p.pnl >= 0 ? "+" : ""}${fmt(p.pnl, p.currency, 0)} (${((p.pnlPct ?? 0) * 100).toFixed(1)}%)`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Orders */}
      <section>
        <h2 className="text-sm uppercase tracking-wide text-foreground/40 mb-2">Recent orders</h2>
        {orders.length === 0 ? (
          <div className="card p-6 text-sm text-foreground/60">
            No orders yet.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Price</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <Fragment key={o.id}>
                    <tr>
                      <td className="px-4 py-2 text-foreground/60 whitespace-nowrap">
                        {new Date(o.executed_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <Link
                          href={`/s/${o.market}/${o.symbol}`}
                          className="hover:underline"
                        >
                          {o.symbol}
                        </Link>
                        <span className="text-xs text-foreground/40 ml-1">· {o.market}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`chip ${o.side === "buy" ? "chip-strong" : "chip-avoid"}`}
                        >
                          {o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{Number(o.qty)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {fmt(Number(o.price), o.currency)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {fmt(Number(o.total), o.currency, 0)}
                      </td>
                    </tr>
                    {o.review && (
                      <tr className="bg-white/5/50">
                        <td></td>
                        <td colSpan={5} className="px-4 py-2 text-xs text-foreground/70">
                          <span className="inline-flex items-center gap-2">
                            <span className="text-foreground/40">🤖 Claude ·</span>
                            {o.review.verdict && (
                              <span
                                className={`chip ${
                                  o.review.verdict === "aligned"
                                    ? "chip-strong"
                                    : o.review.verdict === "misaligned"
                                      ? "chip-avoid"
                                      : "chip-hold"
                                }`}
                              >
                                {o.review.verdict}
                              </span>
                            )}
                          </span>
                          <div className="mt-1 leading-relaxed">{o.review.content}</div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-foreground/40">
        Paper trading uses live Yahoo Finance prices. Starting balance: ₹10,00,000 + $10,000. No
        slippage, no fees modeled — this is a learning tool, not a simulation of your broker.
      </p>
    </div>
  );
}

function AccountCard({
  label,
  cash,
  positionsValue,
  total,
  pnl,
  pnlPct,
  currency,
}: {
  label: string;
  cash: number;
  positionsValue: number;
  total: number;
  pnl: number;
  pnlPct: number;
  currency: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-foreground/40">{label}</div>
      <div className="flex items-baseline gap-3 mt-1">
        <div className="text-3xl font-bold">
          {sym(currency)}
          {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div
          className={`text-sm ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}
        >
          {pnl >= 0 ? "+" : ""}
          {sym(currency)}
          {Math.abs(pnl).toLocaleString(undefined, { maximumFractionDigits: 0 })} (
          {(pnlPct * 100).toFixed(2)}%)
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 text-xs gap-y-1">
        <span className="text-foreground/60">Cash</span>
        <span className="text-right tabular-nums">
          {sym(currency)}
          {cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className="text-foreground/60">Positions value</span>
        <span className="text-right tabular-nums">
          {sym(currency)}
          {positionsValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
