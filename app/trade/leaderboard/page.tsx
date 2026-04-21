"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getClientId } from "@/lib/clientId";

type Row = {
  client: string;
  joinedAt: string;
  trades: number;
  positions: number;
  cashInr: number;
  cashUsd: number;
  posValueInr: number;
  posValueUsd: number;
  navUsd: number;
  retPct: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cid, setCid] = useState<string>("");

  useEffect(() => {
    setCid(getClientId());
    (async () => {
      try {
        const r = await fetch("/api/trade/leaderboard");
        const j = await r.json();
        setRows(j.rows ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const youIdx = rows.findIndex((r) => cid.startsWith(r.client.replace("…", "")));

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-foreground/60 mt-1">
            All paper trading accounts ranked by total return, normalized to USD. Starting stake:
            ₹10,00,000 + $10,000 (~$22K combined). Prices from the score cache.
          </p>
        </div>
        <Link href="/trade" className="text-sm underline text-foreground/60">
          ← your account
        </Link>
      </div>

      {loading && <div className="card p-6 text-sm text-foreground/60">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="card p-6 text-sm text-foreground/60">
          No accounts yet. Be the first —{" "}
          <Link href="/" className="underline">
            find a stock
          </Link>{" "}
          and tap <b>Trade</b>.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          {youIdx >= 0 && (
            <div className="card p-4 bg-amber-500/10 border-amber-200 text-sm">
              You're ranked <b>#{youIdx + 1}</b> with {(rows[youIdx].retPct * 100).toFixed(2)}%
              return across {rows[youIdx].trades} trades.
            </div>
          )}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
                <tr>
                  <th className="px-4 py-2 w-12">#</th>
                  <th className="px-4 py-2">Account</th>
                  <th className="px-4 py-2 text-right">Return</th>
                  <th className="px-4 py-2 text-right">NAV (USD)</th>
                  <th className="px-4 py-2 text-right">Trades</th>
                  <th className="px-4 py-2 text-right">Positions</th>
                  <th className="px-4 py-2 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r, i) => {
                  const isYou = cid.startsWith(r.client.replace("…", ""));
                  const podium = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
                  return (
                    <tr key={r.client} className={isYou ? "bg-amber-500/10" : ""}>
                      <td className="px-4 py-2 text-foreground/40 tabular-nums">
                        {podium || i + 1}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground/80">
                        {r.client} {isYou && <span className="ml-2 chip chip-hold">you</span>}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums font-semibold ${
                          r.retPct >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {r.retPct >= 0 ? "+" : ""}
                        {(r.retPct * 100).toFixed(2)}%
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        ${r.navUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.trades}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.positions}</td>
                      <td className="px-4 py-2 text-right text-xs text-foreground/60">
                        {new Date(r.joinedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="text-xs text-foreground/40">
        Leaderboard is for bragging rights only. NAV uses the last price in the score cache
        (refreshed on dashboard visits). Fixed FX at ₹1 = $0.012 — that's a ranking convenience,
        not a live rate.
      </p>
    </div>
  );
}
