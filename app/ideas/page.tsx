"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tradingFetch } from "@/lib/clientId";

type Pick = {
  market: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  score: number;
  verdict: string;
  moat: string | null;
  peg: number | null;
  pe: number | null;
  tags: string[];
  newsHeadline: string | null;
  thesis: string;
};

type Response = {
  picks: Pick[];
  summary: string;
  meta?: {
    universe_size: number;
    owned_sectors: string[];
    week_start: string;
  };
};

const TAG_LABEL: Record<string, string> = {
  "strong-buy": "Strong buy",
  "score-uptick": "Score improving",
  diversifier: "Diversifier",
  "news-tailwind": "Positive news",
  "wide-moat": "Wide moat",
  "peg-undervalued": "PEG < 1",
};

const VERDICT_TONE: Record<string, string> = {
  strong_buy: "chip-strong",
  buy: "chip-buy",
  hold: "chip-hold",
  avoid: "chip-avoid",
};

export default function IdeasPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  async function generate() {
    setLoading(true);
    try {
      const r = await tradingFetch("/api/ideas", { method: "POST" });
      const j = await r.json();
      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate();
  }, []);

  async function dismiss(p: Pick) {
    const key = `${p.market}/${p.symbol}`;
    setDismissing((s) => new Set(s).add(key));
    await tradingFetch("/api/ideas/feedback", {
      method: "POST",
      body: JSON.stringify({ market: p.market, symbol: p.symbol, action: "dismiss" }),
    });
    setData((d) =>
      d ? { ...d, picks: d.picks.filter((x) => `${x.market}/${x.symbol}` !== key) } : d,
    );
  }

  async function watch(p: Pick) {
    await tradingFetch("/api/ideas/feedback", {
      method: "POST",
      body: JSON.stringify({ market: p.market, symbol: p.symbol, action: "watch" }),
    });
    // Also push into browser watchlist (consistent with WatchButton behavior)
    try {
      const raw = localStorage.getItem("fi.watchlist");
      const list: any[] = raw ? JSON.parse(raw) : [];
      const key = `${p.market}/${p.symbol}`;
      if (!list.find((x) => `${x.market}/${x.symbol}` === key)) {
        list.unshift({ market: p.market, symbol: p.symbol, name: p.name, addedAt: Date.now() });
        localStorage.setItem("fi.watchlist", JSON.stringify(list.slice(0, 30)));
      }
    } catch {}
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-foreground/40 uppercase tracking-wide">Tool 8 · AI Idea Generation</div>
          <h1 className="text-3xl font-bold mt-1">5 ideas tuned to you</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Ranked from our scored universe, filtered by what you already own, and weighted toward
            diversifiers + score upticks + positive news tailwinds.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-foreground text-background rounded px-4 h-10 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Ranking…" : "Regenerate"}
        </button>
      </div>

      {loading && !data && (
        <div className="text-foreground/60">Ranking universe and writing theses…</div>
      )}

      {data && (
        <>
          <div className="card p-4 text-sm">
            <div className="text-foreground/80">{data.summary}</div>
            {data.meta && (
              <div className="text-xs text-foreground/40 mt-1">
                Universe: {data.meta.universe_size} scored stocks · Already holding:{" "}
                {data.meta.owned_sectors.length} sectors · Week of {data.meta.week_start}
              </div>
            )}
          </div>

          {data.picks.length === 0 ? (
            <div className="card p-8 text-center text-sm text-foreground/60">
              No picks this round. Try after more stocks are scored (visit dashboards) or clear
              your dismissals.
            </div>
          ) : (
            <div className="space-y-3">
              {data.picks.map((p, i) => (
                <article key={`${p.market}/${p.symbol}`} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-sm font-semibold text-foreground/70 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/s/${p.market}/${p.symbol}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {p.name ?? p.symbol}
                        </Link>
                        <span className="text-xs text-foreground/50">
                          {p.market} · {p.sector ?? "—"}
                        </span>
                        <span className={`chip ${VERDICT_TONE[p.verdict] ?? "chip-hold"}`}>
                          {p.verdict.replace("_", " ")}
                        </span>
                        <span className="text-xs tabular-nums text-foreground/60">
                          Score {p.score.toFixed(1)}
                        </span>
                      </div>

                      <p className="text-sm text-foreground/85 leading-relaxed mt-2">
                        {p.thesis}
                      </p>

                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {p.tags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-foreground/70 border border-white/10"
                            >
                              {TAG_LABEL[t] ?? t}
                            </span>
                          ))}
                        </div>
                      )}

                      {p.newsHeadline && (
                        <div className="mt-3 text-xs text-foreground/50 border-l-2 border-sky-400/40 pl-3">
                          📰 {p.newsHeadline}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/s/${p.market}/${p.symbol}`}
                          className="bg-foreground text-background rounded px-3 h-8 inline-flex items-center text-xs font-medium"
                        >
                          View dashboard →
                        </Link>
                        <button
                          onClick={() => watch(p)}
                          className="border border-white/15 rounded px-3 h-8 text-xs"
                        >
                          Add to watchlist
                        </button>
                        <button
                          onClick={() => dismiss(p)}
                          disabled={dismissing.has(`${p.market}/${p.symbol}`)}
                          className="text-xs text-foreground/50 hover:text-rose-300 ml-auto"
                        >
                          Not interested
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <div className="text-xs text-foreground/40 pt-4">
        Ranking: base = score_cache total (0-10). Bonuses: +2 strong-buy · +3 sector-diversifier ·
        +2 score-uptick · +1 style-match · +1 positive-news · −1 sector-overweight · −4 avoid.
        Filters: never suggest what you own or dismissed. Theses written by Claude Sonnet 4.6 from
        the candidate metrics above.
      </div>
    </div>
  );
}
