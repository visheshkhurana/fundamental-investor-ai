"use client";
import Link from "next/link";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Row = {
  market: string;
  symbol: string;
  name: string | null;
  industry: string | null;
  sector: string | null;
  price: number | null;
  currency: string | null;
  market_cap: number | null;
  total_score: number;
  verdict: string;
  cat_company: number;
  cat_valuation: number;
  piotroski: number;
  altman_z: number | null;
  altman_zone: string | null;
  moat_type: string;
  moat_strength: string;
  pe: number | null;
  peg: number | null;
  de: number | null;
  updated_at: string;
};

const PRESETS = [
  { id: "none", label: "All", hint: "No preset" },
  { id: "buffett", label: "Buffett", hint: "Moat + FCF+ + low debt + score ≥ 6" },
  { id: "lynch", label: "Lynch", hint: "PEG < 1 and reasonable P/E" },
  { id: "dorsey", label: "Wide moat only", hint: "Dorsey — wide moats" },
  { id: "value_trap_reverse", label: "Cheap & strong", hint: "Low P/E + high Piotroski — avoids value traps" },
];

function chip(s: number) {
  if (s >= 8) return "chip chip-strong";
  if (s >= 6) return "chip chip-buy";
  if (s >= 4) return "chip chip-hold";
  return "chip chip-avoid";
}

function ScreenInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const preset = params.get("preset") ?? "none";
  const market = params.get("market") ?? "";
  const minScore = params.get("minScore") ?? "0";
  const moat = params.get("moat") ?? "";
  const sort = params.get("sort") ?? "total_score.desc";

  const updateParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    router.push(`/screen?${p.toString()}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (preset) qs.set("preset", preset);
      if (market) qs.set("market", market);
      if (minScore) qs.set("minScore", minScore);
      if (moat) qs.set("moat", moat);
      if (sort) qs.set("sort", sort);
      qs.set("limit", "50");
      const r = await fetch(`/api/screen?${qs.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "load failed");
      setRows(j.results);
    } catch (e: any) {
      setErr(e?.message ?? "failed");
    } finally {
      setLoading(false);
    }
  }, [preset, market, minScore, moat, sort]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Screener</h1>
        <p className="text-sm text-foreground/60 mt-1">
          Hunt for stocks that fit your investing style. Results come from the scoring framework
          applied to every stock you (or anyone) has looked at — score cache refreshes as the app
          is used.
        </p>
      </div>

      {/* Presets */}
      <div>
        <div className="text-xs uppercase tracking-wide text-foreground/40 mb-2">Presets</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => updateParam("preset", p.id === "none" ? "" : p.id)}
              title={p.hint}
              className={`rounded-full px-3 py-1 text-sm border ${
                (preset === p.id || (p.id === "none" && !params.get("preset")))
                  ? "bg-white/[0.04] text-white border-white"
                  : "border-white/15 hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 grid md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-foreground/60">Market</label>
          <select
            value={market}
            onChange={(e) => updateParam("market", e.target.value)}
            className="w-full border border-white/15 rounded px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="IN">India (NSE/BSE)</option>
            <option value="US">US (NYSE/NASDAQ)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground/60">Min score</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={minScore}
            onChange={(e) => updateParam("minScore", e.target.value)}
            className="w-full border border-white/15 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-foreground/60">Moat</label>
          <select
            value={moat}
            onChange={(e) => updateParam("moat", e.target.value)}
            className="w-full border border-white/15 rounded px-2 py-1.5 text-sm"
          >
            <option value="">Any</option>
            <option value="wide">Wide</option>
            <option value="narrow">Narrow</option>
            <option value="none">None</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground/60">Sort</label>
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="w-full border border-white/15 rounded px-2 py-1.5 text-sm"
          >
            <option value="total_score.desc">Score (high → low)</option>
            <option value="cat_valuation.desc">Valuation score</option>
            <option value="cat_company.desc">Company score</option>
            <option value="piotroski.desc">Piotroski</option>
            <option value="peg.asc">PEG (low → high)</option>
            <option value="pe.asc">P/E (low → high)</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {err && <div className="card p-4 text-sm text-rose-300">Error: {err}</div>}

      {loading && (
        <div className="card p-6 text-sm text-foreground/60">Loading…</div>
      )}

      {!loading && rows.length === 0 && !err && (
        <div className="card p-6 text-sm text-foreground/60">
          No stocks match these filters yet. The score cache fills as people visit stock
          dashboards — try loosening the filters or{" "}
          <Link href="/" className="underline">
            search a stock
          </Link>{" "}
          first.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-foreground/60">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Market</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2 text-right">P/E</th>
                <th className="px-4 py-2 text-right">PEG</th>
                <th className="px-4 py-2 text-right">Piotroski</th>
                <th className="px-4 py-2">Moat</th>
                <th className="px-4 py-2">Industry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r, i) => (
                <tr key={`${r.market}-${r.symbol}`} className="hover:bg-white/5">
                  <td className="px-4 py-2 text-foreground/40">{i + 1}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/s/${r.market}/${r.symbol}`}
                      className="font-medium hover:underline"
                    >
                      {r.symbol}
                    </Link>
                    <div className="text-xs text-foreground/60 truncate max-w-[22ch]">{r.name}</div>
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground/60">{r.market}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={chip(Number(r.total_score))}>
                      {Number(r.total_score).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.pe != null ? Number(r.pe).toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.peg != null ? Number(r.peg).toFixed(2) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.piotroski != null ? `${r.piotroski}/9` : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs capitalize">
                    <span
                      className={
                        r.moat_strength === "wide"
                          ? "text-emerald-300 font-medium"
                          : r.moat_strength === "narrow"
                            ? "text-blue-700"
                            : "text-foreground/60"
                      }
                    >
                      {r.moat_strength}
                    </span>{" "}
                    <span className="text-foreground/40">· {r.moat_type.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-foreground/60 truncate max-w-[20ch]">
                    {r.industry}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-foreground/40">
        Screener reads from a cache populated as stocks are viewed. Visit{" "}
        <Link href="/" className="underline">
          more stocks
        </Link>{" "}
        to expand what's available to screen.
      </p>
    </div>
  );
}

export default function ScreenPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-foreground/60">Loading…</div>}>
      <ScreenInner />
    </Suspense>
  );
}
