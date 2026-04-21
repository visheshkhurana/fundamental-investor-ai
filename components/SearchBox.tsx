"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Suggestion = {
  market: string;
  symbol: string;
  name: string;
  industry: string | null;
};

export default function SearchBox() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (!q.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setItems(j.results ?? []);
      setLoading(false);
      setOpen(true);
    }, 180);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search any stock — RELIANCE, INFY, AAPL, NVDA…"
        className="w-full text-lg border border-white/15 bg-[hsl(var(--card-fill))] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30"
      />
      {open && (items.length > 0 || loading) && (
        <div className="absolute left-0 right-0 mt-1 bg-[hsl(var(--card-fill))] border border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
          {loading && items.length === 0 && (
            <div className="px-4 py-3 text-sm text-foreground/60">Searching…</div>
          )}
          {items.map((s) => (
            <Link
              key={`${s.market}-${s.symbol}`}
              href={`/s/${s.market}/${s.symbol}`}
              className="flex items-center justify-between px-4 py-2 hover:bg-white/5 text-sm"
            >
              <div>
                <div className="font-medium">
                  {s.symbol}{" "}
                  <span className="text-xs text-foreground/40 font-normal">· {s.market}</span>
                </div>
                <div className="text-xs text-foreground/60">
                  {s.name}
                  {s.industry ? ` · ${s.industry}` : ""}
                </div>
              </div>
              <span className="text-foreground/40 text-xs">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
