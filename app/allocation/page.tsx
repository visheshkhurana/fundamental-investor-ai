"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { tradingFetch } from "@/lib/clientId";
import { ASSET_CLASS_LABEL, ASSET_CLASSES, type AssetClass } from "@/lib/assets";

type AllocationResponse = {
  current: Record<AssetClass, number>;
  target: Record<AssetClass, number>;
  delta: Record<AssetClass, number>;
  rationale: string[];
  total_nav_inr: number;
  cash_floor_inr: number;
  cash_shortfall_inr: number;
  plan: { asset_class: AssetClass; delta_pp: number; inr_amount: number }[];
  has_profile: boolean;
};

const COLOR: Record<AssetClass, string> = {
  public_equity:     "#60a5fa",  // blue
  private_companies: "#a78bfa",  // purple
  debt:              "#34d399",  // emerald
  real_estate:       "#fb923c",  // orange
  bullion:           "#facc15",  // amber
  alternates:        "#22d3ee",  // cyan
  crypto:            "#f472b6",  // pink
  art:               "#e879f9",  // fuchsia
  cash:              "#94a3b8",  // slate
};

export default function AllocationPage() {
  const [data, setData] = useState<AllocationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await tradingFetch("/api/allocation");
        const j = await r.json();
        setData(j);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="text-foreground/60 py-12">Computing your allocation…</div>;
  }
  if (!data) {
    return <div className="text-rose-300 py-12">Couldn't load allocation.</div>;
  }

  const emptyPortfolio = data.total_nav_inr <= 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-foreground/40 uppercase tracking-wide">Tool 1 · Wealth allocation</div>
          <h1 className="text-3xl font-bold mt-1">Where should my money live?</h1>
          <p className="text-sm text-foreground/60 mt-2 max-w-2xl">
            Your target mix vs your current mix. Driven by your age, risk tolerance, horizon, and
            tax residence. Move drift back inside ±2pp and you're rebalanced.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/onboarding"
            className="border border-white/15 rounded px-4 h-10 inline-flex items-center text-sm"
          >
            Edit profile
          </Link>
          <Link
            href="/ideas"
            className="bg-foreground text-background rounded px-4 h-10 inline-flex items-center text-sm font-medium"
          >
            Get ideas →
          </Link>
        </div>
      </div>

      {!data.has_profile && (
        <div className="card p-5 border-amber-500/30 bg-amber-500/5">
          <div className="text-sm font-semibold text-amber-200">
            Using defaults (age 35 · balanced risk)
          </div>
          <p className="text-xs text-foreground/70 mt-1">
            <Link href="/onboarding" className="underline">
              Fill your profile
            </Link>{" "}
            to personalize these targets to your situation.
          </p>
        </div>
      )}

      {emptyPortfolio && (
        <div className="card p-5 border-sky-500/30 bg-sky-500/5">
          <div className="text-sm font-semibold text-sky-200">
            No assets added yet
          </div>
          <p className="text-xs text-foreground/70 mt-1">
            Your target is shown. Add assets in{" "}
            <Link href="/onboarding" className="underline">onboarding</Link>{" "}
            to see the delta and rebalance plan.
          </p>
        </div>
      )}

      {/* Two donuts side-by-side */}
      <div className="grid md:grid-cols-2 gap-6">
        <DonutCard title="Current" allocation={data.current} total={data.total_nav_inr} />
        <DonutCard title="Target" allocation={data.target} total={data.total_nav_inr} />
      </div>

      {/* Delta bars */}
      <div className="card p-6">
        <div className="text-sm font-semibold mb-4">Gap to target</div>
        <div className="space-y-2.5">
          {ASSET_CLASSES.map((c) => {
            const cur = data.current[c] ?? 0;
            const tgt = data.target[c] ?? 0;
            if (cur < 0.005 && tgt < 0.005) return null;
            const d = (tgt - cur) * 100;
            const max = Math.max(Math.abs(d), 5);
            return (
              <div key={c} className="grid grid-cols-[140px_1fr_110px] items-center gap-3">
                <div className="text-xs text-foreground/70">{ASSET_CLASS_LABEL[c]}</div>
                <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-1/2 h-full"
                    style={{
                      width: `${(Math.abs(d) / max) * 50}%`,
                      transform: d >= 0 ? "none" : "translateX(-100%)",
                      backgroundColor: d >= 0 ? "#34d399" : "#fb7185",
                    }}
                  />
                  <div className="absolute top-0 left-1/2 h-full w-px bg-white/20" />
                </div>
                <div className="text-xs tabular-nums text-right">
                  <span className="text-foreground/50">{(cur * 100).toFixed(0)}%</span>
                  <span className="text-foreground/30 mx-1">→</span>
                  <span>{(tgt * 100).toFixed(0)}%</span>
                  <span
                    className={`ml-2 ${d >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {d >= 0 ? "+" : ""}
                    {d.toFixed(1)}pp
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rebalance plan */}
      {data.plan.length > 0 && (
        <div className="card p-6">
          <div className="text-sm font-semibold mb-3">Rebalance plan</div>
          <ol className="space-y-2 text-sm">
            {data.plan.map((row, i) => (
              <li key={row.asset_class} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-white/5 grid place-items-center text-xs text-foreground/60 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {row.delta_pp >= 0 ? "Add to" : "Trim"} {ASSET_CLASS_LABEL[row.asset_class]}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {row.delta_pp >= 0 ? "+" : ""}
                    {row.delta_pp.toFixed(1)}pp ≈ ₹
                    {Math.round(Math.abs(row.inr_amount)).toLocaleString("en-IN")}
                  </div>
                </div>
                {row.asset_class === "public_equity" && (
                  <Link
                    href="/curator"
                    className="text-xs border border-white/15 rounded px-3 py-1"
                  >
                    Find stocks →
                  </Link>
                )}
                {row.asset_class === "cash" && row.delta_pp > 0 && (
                  <span className="text-xs text-amber-300">Reduce risk</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Liquidity floor */}
      {data.cash_floor_inr > 0 && (
        <div
          className={`card p-5 ${
            data.cash_shortfall_inr > 0
              ? "border-rose-500/30 bg-rose-500/5"
              : "border-emerald-500/20 bg-emerald-500/5"
          }`}
        >
          <div className="text-sm font-semibold">
            Liquidity floor: ₹{Math.round(data.cash_floor_inr).toLocaleString("en-IN")} (6× expenses)
          </div>
          <p className="text-xs text-foreground/70 mt-1">
            {data.cash_shortfall_inr > 0
              ? `You're short ₹${Math.round(
                  data.cash_shortfall_inr,
                ).toLocaleString("en-IN")} of cash. Top up before adding risk.`
              : "You're above your liquidity floor."}
          </p>
        </div>
      )}

      {/* Rationale */}
      <div className="card p-6">
        <div className="text-sm font-semibold mb-3">Why this target</div>
        <ul className="space-y-2 text-sm text-foreground/80">
          {data.rationale.map((r, i) => (
            <li key={i} className="pl-4 relative">
              <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-foreground/40" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="text-xs text-foreground/40">
        Method: age-glide equity rule (equity% ≈ 110 − age), ±10pp for risk tolerance, geography
        tilt (India residents carry 15% real estate + 7% bullion by default), MPT-inspired buckets
        for alternates and crypto. Recomputed every time you visit. Snapshots stored to{" "}
        <code>allocation_recommendations</code>.
      </div>
    </div>
  );
}

function DonutCard({
  title,
  allocation,
  total,
}: {
  title: string;
  allocation: Record<AssetClass, number>;
  total: number;
}) {
  const slices = (Object.keys(allocation) as AssetClass[])
    .map((k) => ({ key: k, frac: allocation[k] ?? 0 }))
    .filter((s) => s.frac > 0.005)
    .sort((a, b) => b.frac - a.frac);

  // SVG donut
  const R = 70;
  const C = 2 * Math.PI * R;
  let accum = 0;

  return (
    <div className="card p-6">
      <div className="text-sm font-semibold">{title}</div>
      {total > 0 && (
        <div className="text-xs text-foreground/50 mt-0.5">
          NAV ≈ ₹{Math.round(total).toLocaleString("en-IN")}
        </div>
      )}

      <div className="mt-4 grid md:grid-cols-[180px_1fr] gap-6 items-center">
        <div className="relative w-[180px] h-[180px]">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="18" />
            {slices.map((s) => {
              const len = s.frac * C;
              const offset = -accum;
              accum += len;
              return (
                <circle
                  key={s.key}
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  stroke={COLOR[s.key]}
                  strokeWidth="18"
                  strokeDasharray={`${len} ${C - len}`}
                  strokeDashoffset={offset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-foreground/40">
                {title}
              </div>
              <div className="text-lg font-semibold mt-0.5">
                {(slices.reduce((s, x) => s + x.frac, 0) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: COLOR[s.key] }}
              />
              <span className="flex-1 text-foreground/80">{ASSET_CLASS_LABEL[s.key]}</span>
              <span className="tabular-nums text-foreground/60">
                {(s.frac * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
