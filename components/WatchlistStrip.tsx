"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type WatchItem = {
  market: string;
  symbol: string;
  name: string | null;
  addedAt: string;
};

type Live = { price: number | null; score: number; verdict: string; currency: string | null };

const KEY = "fi.watchlist.v1";

function verdictChip(s: number) {
  if (s >= 8) return "chip chip-strong";
  if (s >= 6) return "chip chip-buy";
  if (s >= 4) return "chip chip-hold";
  return "chip chip-avoid";
}

export default function WatchlistStrip() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [live, setLive] = useState<Record<string, Live>>({});

  const refresh = async (list: WatchItem[]) => {
    const entries = await Promise.all(
      list.map(async (it) => {
        try {
          const r = await fetch(`/api/stock/${it.market}/${it.symbol}`);
          if (!r.ok) return null;
          const j = await r.json();
          return [
            `${it.market}-${it.symbol}`,
            {
              price: j.quote?.price ?? null,
              score: j.score?.total ?? 0,
              verdict: j.score?.verdict ?? "hold",
              currency: j.quote?.currency ?? null,
            } as Live,
          ] as const;
        } catch {
          return null;
        }
      })
    );
    setLive(Object.fromEntries(entries.filter(Boolean) as any));
  };

  useEffect(() => {
    const load = () => {
      const list: WatchItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      setItems(list);
      refresh(list);
    };
    load();
    window.addEventListener("fi-watchlist-changed", load);
    return () => window.removeEventListener("fi-watchlist-changed", load);
  }, []);

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm uppercase tracking-wide text-foreground/40">
          Your watchlist · {items.length}
        </h2>
        <span className="text-xs text-foreground/40">
          Live scores
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => {
          const l = live[`${it.market}-${it.symbol}`];
          return (
            <Link
              key={`${it.market}-${it.symbol}`}
              href={`/s/${it.market}/${it.symbol}`}
              className="card card-hover p-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{it.symbol}</div>
                {l ? (
                  <span className={verdictChip(l.score)}>{l.score.toFixed(1)}</span>
                ) : (
                  <span className="text-xs text-foreground/40">…</span>
                )}
              </div>
              <div className="text-xs text-foreground/60 mt-0.5 truncate">{it.name ?? it.market}</div>
              {l?.price != null && (
                <div className="text-xs text-foreground/60 mt-1">
                  {l.currency === "INR" ? "₹" : "$"}
                  {l.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
