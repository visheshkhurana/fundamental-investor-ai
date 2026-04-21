"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { tradingFetch } from "@/lib/clientId";
import { STYLE_COLOR, STYLE_LABEL, type InvestmentStyle } from "@/lib/style";

type SectorRow = {
  sector: string;
  value_usd: number;
  pct: number;
  n: number;
  top_symbol: string;
};
type StyleRow = {
  style: InvestmentStyle;
  value_usd: number;
  pct: number;
  n: number;
  top_symbol: string;
};
type LensData = {
  total_value_usd: number;
  positions: number;
  by_sector: SectorRow[];
  by_style: StyleRow[];
  flags: string[];
};

const SECTOR_COLORS = [
  "#60a5fa", // blue
  "#f472b6", // pink
  "#34d399", // emerald
  "#fbbf24", // amber
  "#a78bfa", // violet
  "#f87171", // rose
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#4ade80", // green
  "#c084fc", // purple
];

export default function LensPage() {
  const [data, setData] = useState<LensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await tradingFetch("/api/lens");
        const j = await r.json();
        if (!r.ok) setErr(j.error ?? "failed");
        else setData(j);
      } catch (e: any) {
        setErr(e?.message ?? "network");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="py-16 text-center text-foreground/60">Loading…</div>;

  if (err || !data) {
    return (
      <div className="py-16 text-center">
        <div className="text-xl font-semibold mb-2">Couldn't load lens</div>
        <p className="text-sm text-foreground/60">{err}</p>
      </div>
    );
  }

  if (data.positions === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Portfolio Lens</h1>
        <p className="text-foreground/60 max-w-md mx-auto mb-6">
          Once you have paper trading positions, this page breaks your book down by sector and by
          investing style.
        </p>
        <Link
          href="/"
          className="bg-white/[0.04] text-white border border-white/15 rounded-lg px-4 py-2 inline-block text-sm"
        >
          Find a stock →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Portfolio Lens</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Your paper-trading book, broken down by sector and by investing style.
          </p>
        </div>
        <div className="text-sm text-foreground/60">
          {data.positions} position{data.positions === 1 ? "" : "s"} · $
          {data.total_value_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })} total
        </div>
      </header>

      {data.flags.length > 0 && (
        <div className="card p-4 bg-amber-500/10 border-amber-500/30">
          <div className="text-xs uppercase tracking-wide text-amber-300 mb-2">Flags</div>
          <ul className="text-sm space-y-1">
            {data.flags.map((f, i) => (
              <li key={i} className="text-foreground/80">
                • {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sectors */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-3">By sector</h2>
        <div className="card overflow-hidden">
          {data.by_sector.map((r, i) => (
            <Row
              key={r.sector}
              label={r.sector}
              pct={r.pct}
              value={r.value_usd}
              n={r.n}
              topSymbol={r.top_symbol}
              color={SECTOR_COLORS[i % SECTOR_COLORS.length]}
              last={i === data.by_sector.length - 1}
            />
          ))}
        </div>
      </section>

      {/* Styles */}
      <section>
        <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-3">By style</h2>
        <div className="card overflow-hidden">
          {data.by_style.map((r, i) => (
            <Row
              key={r.style}
              label={STYLE_LABEL[r.style]}
              pct={r.pct}
              value={r.value_usd}
              n={r.n}
              topSymbol={r.top_symbol}
              color={STYLE_COLOR[r.style]}
              last={i === data.by_style.length - 1}
            />
          ))}
        </div>
        <p className="text-xs text-foreground/50 mt-3">
          Styles: <b className="text-foreground/80">Quality</b> (ROE &gt; 20%, margins &gt; 20%,
          low debt) · <b className="text-foreground/80">Growth</b> (earnings &amp; revenue growth &gt;
          12–15%, P/E &gt; 25) · <b className="text-foreground/80">Value</b> (PEG &lt; 1.2, P/B &lt;
          3, Piotroski ≥ 6, P/E &lt; 20) · <b className="text-foreground/80">Balanced</b> otherwise.
        </p>
      </section>

      <p className="text-xs text-foreground/40">
        Values normalized to USD at ₹1 = $0.012. Classifications pulled from the latest
        <Link href="/screen" className="underline mx-1">
          score cache
        </Link>
        entry per position — revisit a stock dashboard to refresh its metrics if stale.
      </p>
    </div>
  );
}

function Row({
  label,
  pct,
  value,
  n,
  topSymbol,
  color,
  last,
}: {
  label: string;
  pct: number;
  value: number;
  n: number;
  topSymbol: string;
  color: string;
  last: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${last ? "" : "border-b border-white/5"}`}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: color }}
            aria-hidden
          />
          <span className="font-medium capitalize">{label}</span>
          <span className="text-xs text-foreground/40">
            · {n} stock{n === 1 ? "" : "s"} · largest: {topSymbol}
          </span>
        </div>
        <div className="text-sm tabular-nums">
          <span className="font-semibold">{pct.toFixed(1)}%</span>
          <span className="text-foreground/40 ml-2">
            ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct, 1)}%`, background: color }}
        />
      </div>
    </div>
  );
}
