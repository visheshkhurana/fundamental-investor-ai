"use client";
import { useEffect, useState } from "react";

type WatchItem = {
  market: string;
  symbol: string;
  name: string | null;
  addedAt: string;
};

const KEY = "fi.watchlist.v1";

function load(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(items: WatchItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("fi-watchlist-changed"));
}

export default function WatchButton({
  market,
  symbol,
  name,
}: {
  market: string;
  symbol: string;
  name: string | null;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const items = load();
    setOn(items.some((i) => i.market === market && i.symbol === symbol));
  }, [market, symbol]);

  const toggle = () => {
    const items = load();
    const exists = items.some((i) => i.market === market && i.symbol === symbol);
    const next = exists
      ? items.filter((i) => !(i.market === market && i.symbol === symbol))
      : [...items, { market, symbol, name, addedAt: new Date().toISOString() }];
    save(next);
    setOn(!exists);
  };

  return (
    <button
      onClick={toggle}
      className={`rounded px-3 py-1.5 text-xs transition ${
        on
          ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
          : "border border-white/15 hover:bg-white/5"
      }`}
      aria-pressed={on}
    >
      {on ? "★ Watching" : "☆ Watch"}
    </button>
  );
}
