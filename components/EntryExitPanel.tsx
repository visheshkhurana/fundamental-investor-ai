"use client";
import { useEffect, useState } from "react";
import { tradingFetch } from "@/lib/clientId";
import { entrySignal, exitSignal, entryVerdictLabel, type EntrySignal, type ExitSignal } from "@/lib/signals";
import type { ScoreResult } from "@/lib/scoring";

const VERDICT_TONE: Record<EntrySignal["verdict"], string> = {
  strong_buy: "chip-strong",
  enter:      "chip-strong",
  accumulate: "chip-buy",
  wait:       "chip-hold",
  avoid:      "chip-avoid",
};

const ACTION_TONE: Record<ExitSignal["action"], string> = {
  hold: "chip-strong",
  trim: "chip-hold",
  sell: "chip-avoid",
};

export default function EntryExitPanel({
  market,
  symbol,
  score,
}: {
  market: string;
  symbol: string;
  score: ScoreResult;
}) {
  const entry = entrySignal(score);
  const [exit, setExit] = useState<ExitSignal | null>(null);
  const [checked, setChecked] = useState(false);

  // Check whether the user holds this stock — only then render the exit side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await tradingFetch("/api/trading/account");
        if (!r.ok) return;
        const j = await r.json();
        const pos = (j.positions ?? []).find(
          (p: any) => p.market === market && p.symbol === symbol
        );
        if (!pos) {
          if (!cancelled) setExit(null);
          return;
        }
        const USD_PER_INR = 0.012;
        const positionValueUsd =
          pos.currency === "INR"
            ? Number(pos.value ?? pos.qty * pos.avg_cost) * USD_PER_INR
            : Number(pos.value ?? pos.qty * pos.avg_cost);
        const navUsd = (j.summary?.totalUsd ?? 0) + (j.summary?.totalInr ?? 0) * USD_PER_INR;
        const e = exitSignal(score, {
          heldQty: Number(pos.qty),
          positionValueUsd,
          accountNavUsd: navUsd,
        });
        if (!cancelled) setExit(e);
      } catch {
        /* stay null */
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market, symbol, score]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* ENTRY */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/40">When to enter</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`chip ${VERDICT_TONE[entry.verdict]}`}>
                {entryVerdictLabel(entry.verdict)}
              </span>
              <span className="text-xs text-foreground/50 tabular-nums">
                · {entry.points.toFixed(1)} / 6 pts
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed mb-4">{entry.summary}</p>
        <ul className="space-y-2 text-sm">
          {entry.factors.map((f) => (
            <li key={f.label} className="flex items-start gap-2">
              <Dot result={f.result} />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span>{f.label}</span>
                  <span className="text-[11px] text-foreground/40 font-mono">{f.value}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* EXIT */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-foreground/40">When to exit</div>
            {exit ? (
              <div className="flex items-center gap-2 mt-1">
                <span className={`chip ${ACTION_TONE[exit.action]}`}>{exit.action.toUpperCase()}</span>
                <span className="text-xs text-foreground/50">
                  · {exit.triggers.filter((t) => t.fired).length} / {exit.triggers.length} triggers
                </span>
              </div>
            ) : (
              <div className="text-xs text-foreground/50 mt-1">
                {checked ? "Not in your paper-trading book" : "Checking your positions…"}
              </div>
            )}
          </div>
        </div>
        {exit ? (
          <>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">{exit.summary}</p>
            <ul className="space-y-2 text-sm">
              {exit.triggers.map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <Dot result={t.fired ? (t.severity === "critical" ? "fail" : "neutral") : "pass"} />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={t.fired ? "font-medium" : ""}>{t.label}</span>
                      {t.fired && (
                        <span className="text-[10px] uppercase tracking-wider text-rose-300">
                          fired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-0.5 leading-snug">{t.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-foreground/60">
            Exit triggers show here once you hold this stock in your paper-trading account. Use the{" "}
            <b>Trade</b> button above to open a position first.
          </p>
        )}
      </div>
    </div>
  );
}

function Dot({ result }: { result: "pass" | "fail" | "neutral" }) {
  const color =
    result === "pass" ? "bg-emerald-400" : result === "fail" ? "bg-rose-400" : "bg-amber-400";
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mt-1.5 shrink-0`} aria-hidden />;
}
