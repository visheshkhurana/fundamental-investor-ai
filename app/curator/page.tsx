"use client";
import Link from "next/link";
import { useState } from "react";

type Pick = {
  market: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  industry: string | null;
  score: number;
  verdict: string;
  piotroski: number;
  moat_strength: string;
  moat_type: string;
  pe: number | null;
  peg: number | null;
  reason: string;
  highlights: string[];
};

type Response = {
  summary: string;
  picks: Pick[];
  meta?: { catalogueSize: number; model: string };
};

const SUGGESTIONS = [
  "Undervalued Indian banks with wide moats",
  "US tech with high Piotroski score",
  "Cheap and strong — low P/E, high financial quality",
  "Consumer staples with durable brand moats",
  "Small positions: anything with PEG below 1",
  "Companies where the valuation is the only weakness",
];

function scoreChip(s: number) {
  if (s >= 8) return "chip chip-strong";
  if (s >= 6) return "chip chip-buy";
  if (s >= 4) return "chip chip-hold";
  return "chip chip-avoid";
}

export default function CuratorPage() {
  const [query, setQuery] = useState("");
  const [resp, setResp] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text || loading) return;
    setQuery(text);
    setLoading(true);
    setErr(null);
    setResp(null);
    try {
      const r = await fetch("/api/curate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error ?? "curator failed");
      } else {
        setResp(j);
      }
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">AI Curator</h1>
        <p className="text-sm text-foreground/60 mt-1 max-w-2xl">
          Describe the kind of stocks you're looking for in plain English. Claude reads the scored
          catalogue and returns up to 5 picks with the numbers that make each one fit.
        </p>
      </div>

      <div className="card p-4">
        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={2}
            placeholder="e.g., undervalued Indian banks with wide moats"
            maxLength={300}
            className="w-full border border-white/15 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
          />
          <div className="absolute bottom-2 right-2 text-[11px] text-foreground/40">
            {query.length}/300 · ⌘+↵ to send
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="text-xs border border-white/15 rounded-full px-3 py-1 hover:bg-white/5 disabled:opacity-50"
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => submit()}
            disabled={loading || !query.trim()}
            className="bg-white/[0.04] text-white rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Curating…" : "Find stocks"}
          </button>
        </div>
      </div>

      {err && <div className="card p-4 text-sm text-rose-300">Error: {err}</div>}

      {loading && (
        <div className="card p-6 text-sm text-foreground/60">
          Claude is reading the catalogue and ranking matches…
        </div>
      )}

      {resp && (
        <>
          <div className="card p-4 bg-white/5 text-sm">
            <span className="text-foreground/60">Claude ·</span> {resp.summary}
          </div>

          {resp.picks.length === 0 ? (
            <div className="card p-6 text-sm text-foreground/60">
              No matches in the scored catalogue — try broader language, or{" "}
              <Link href="/" className="underline">
                visit some stocks
              </Link>{" "}
              to expand the universe.
            </div>
          ) : (
            <div className="space-y-3">
              {resp.picks.map((p, i) => (
                <Link
                  key={`${p.market}-${p.symbol}`}
                  href={`/s/${p.market}/${p.symbol}`}
                  className="block card card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-foreground/40 tabular-nums">
                          #{i + 1}
                        </span>
                        <span className="font-semibold">{p.symbol}</span>
                        <span className="text-xs text-foreground/40">· {p.market}</span>
                        <span className={scoreChip(p.score)}>{p.score.toFixed(1)}</span>
                        <span className="text-xs text-foreground/40 capitalize ml-2">
                          {p.moat_strength} {p.moat_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-sm text-foreground/70">{p.name}</div>
                      {(p.sector || p.industry) && (
                        <div className="text-xs text-foreground/40 mt-0.5">
                          {p.sector}
                          {p.industry ? ` · ${p.industry}` : ""}
                        </div>
                      )}
                      <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                        {p.reason}
                      </p>
                      {p.highlights?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.highlights.map((h, j) => (
                            <span
                              key={j}
                              className="text-[11px] bg-white/10 text-foreground/80 rounded px-2 py-0.5"
                            >
                              {h}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-foreground/40 whitespace-nowrap">
                      Piotroski {p.piotroski}/9
                      <br />
                      P/E {p.pe != null ? Number(p.pe).toFixed(1) : "—"}
                      <br />
                      PEG {p.peg != null ? Number(p.peg).toFixed(2) : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {resp.meta && (
            <p className="text-xs text-foreground/40">
              Selected from a catalogue of {resp.meta.catalogueSize} scored stocks · model{" "}
              {resp.meta.model}
            </p>
          )}
        </>
      )}

      <p className="text-xs text-foreground/40 max-w-2xl">
        The curator only picks from stocks already in the score cache. If a ticker you care about
        isn't showing up, search it — one visit caches its score for everyone.
      </p>
    </div>
  );
}
