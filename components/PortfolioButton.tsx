"use client";
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

function load(): Position[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(p: Position[]) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export default function PortfolioButton({
  market,
  symbol,
  name,
  currency,
  score,
  verdict,
}: {
  market: string;
  symbol: string;
  name: string | null;
  currency: string | null;
  score: number;
  verdict: string;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const exists = load().some((p) => p.market === market && p.symbol === symbol);
    setAdded(exists);
  }, [market, symbol]);

  const commit = () => {
    const q = parseFloat(qty);
    const c = parseFloat(cost);
    if (!Number.isFinite(q) || !Number.isFinite(c) || q <= 0 || c <= 0) return;
    const portfolio = load().filter((p) => !(p.market === market && p.symbol === symbol));
    portfolio.push({
      market,
      symbol,
      name,
      qty: q,
      avgCost: c,
      currency,
      score,
      verdict,
      addedAt: new Date().toISOString(),
    });
    save(portfolio);
    setAdded(true);
    setOpen(false);
  };

  const remove = () => {
    save(load().filter((p) => !(p.market === market && p.symbol === symbol)));
    setAdded(false);
  };

  if (added) {
    return (
      <button onClick={remove} className="border border-white/15 rounded px-3 py-1.5 text-xs">
        ✓ In portfolio · Remove
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white/[0.04] text-white rounded px-3 py-1.5 text-xs"
      >
        + Add to portfolio
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[hsl(var(--card-fill))] rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold mb-2">Add {symbol} to portfolio</div>
            <label className="text-xs text-foreground/60">Quantity</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full border border-white/15 rounded px-3 py-2 text-sm mb-3"
              placeholder="e.g., 50"
            />
            <label className="text-xs text-foreground/60">Average buy price ({currency ?? "?"})</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full border border-white/15 rounded px-3 py-2 text-sm mb-4"
              placeholder={currency === "INR" ? "e.g., 2610" : "e.g., 178"}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="border border-white/15 rounded px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={commit}
                className="bg-white/[0.04] text-white rounded px-3 py-1.5 text-sm"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-foreground/40 mt-3">
              Stored locally in your browser. No server record.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
