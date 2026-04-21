// Target asset allocation engine.
// Pure functions — no DB, no network. Driven by user profile + liquidity needs.

import type { AssetClass } from "./assets";
import { ASSET_CLASSES, USD_PER_INR } from "./assets";

export type AllocationMap = Record<AssetClass, number>; // values sum to 1

export type ProfileInput = {
  age: number | null;
  riskTolerance: number | null;     // 1..5
  taxResidence: string | null;      // 'IN' | 'US'
  monthlyExpensesInr: number | null;
  monthlyExpensesUsd: number | null;
  retireTargetAge: number | null;
};

// Defaults if the user hasn't filled profile yet
const FALLBACK: ProfileInput = {
  age: 35,
  riskTolerance: 3,
  taxResidence: "IN",
  monthlyExpensesInr: 80_000,
  monthlyExpensesUsd: null,
  retireTargetAge: 55,
};

// Base glide path: equity fraction by age (Bogle rule-of-thumb, slightly more aggressive).
// equity% ≈ max(20, 110 - age) for risk_tolerance=3. Adjust ±10pp per risk step.
export function targetAllocation(p: ProfileInput): {
  allocation: AllocationMap;
  rationale: string[];
} {
  const profile = { ...FALLBACK, ...p };
  const age = profile.age ?? 35;
  const risk = profile.riskTolerance ?? 3;      // 1..5
  const horizonYears = Math.max(
    5,
    (profile.retireTargetAge ?? 55) - age,
  );

  const rationale: string[] = [];

  // 1) Equity target (public + private)
  const baseEquity = Math.max(0.2, Math.min(0.85, (110 - age) / 100));
  const riskTilt = (risk - 3) * 0.05;           // ±10pp range
  let equityTotal = baseEquity + riskTilt;
  equityTotal = Math.min(0.85, Math.max(0.15, equityTotal));

  rationale.push(
    `Equity exposure targeted at ${(equityTotal * 100).toFixed(0)}% based on age ${age}, risk tolerance ${risk}/5, and ${horizonYears}y horizon to retirement.`,
  );

  // 2) Split equity: 80% public, 20% private at risk=3; more private for higher risk
  const privateShareOfEquity = Math.max(0.05, Math.min(0.30, 0.10 + (risk - 3) * 0.05));
  const publicEquity = equityTotal * (1 - privateShareOfEquity);
  const privateEquity = equityTotal * privateShareOfEquity;

  // 3) Debt: the ballast. Higher for older / lower risk
  let debt = Math.max(0.1, 1 - equityTotal - 0.25); // leave room for real assets + cash + alts
  debt = Math.min(0.6, debt);
  rationale.push(
    `Debt/fixed income set to ${(debt * 100).toFixed(0)}% as stabilizer — reduces drawdowns and funds expenses if equities dip.`,
  );

  // 4) Real estate: anchored at 15% for IN residents (home-owning culture), 10% for US
  const realEstate = profile.taxResidence === "US" ? 0.10 : 0.15;

  // 5) Bullion: hedge — 5% base, +2pp for higher INR exposure
  const bullion = profile.taxResidence === "IN" ? 0.07 : 0.05;

  // 6) Alternates (REITs/InvITs/PE): 3% base, scales with risk
  const alternates = Math.max(0, 0.02 + (risk - 3) * 0.01);

  // 7) Crypto: only for risk >= 4. Cap 5%.
  const crypto = risk >= 4 ? Math.min(0.05, (risk - 3) * 0.02) : 0;

  // 8) Art: 0% recommended unless risk=5 (then 2%)
  const art = risk === 5 ? 0.02 : 0;

  // 9) Cash: 6x monthly expenses minimum, but expressed as % of NAV elsewhere.
  // Here we set a nominal 3% so allocations sum correctly; the dashboard computes
  // the absolute cash floor separately.
  const cash = 0.03;

  // Renormalize so it sums to 1 (we've been a bit loose)
  const rawTotal =
    publicEquity + privateEquity + debt + realEstate + bullion + alternates + crypto + art + cash;
  const scale = 1 / rawTotal;

  const alloc: AllocationMap = {
    public_equity: publicEquity * scale,
    private_companies: privateEquity * scale,
    debt: debt * scale,
    real_estate: realEstate * scale,
    bullion: bullion * scale,
    alternates: alternates * scale,
    crypto: crypto * scale,
    art: art * scale,
    cash: cash * scale,
  };

  rationale.push(
    `Real estate ${(realEstate * 100).toFixed(0)}% anchors the portfolio; bullion ${(bullion * 100).toFixed(0)}% hedges INR inflation.`,
  );
  if (crypto > 0) {
    rationale.push(`Small crypto sleeve ${(crypto * 100).toFixed(0)}% — capped so a drawdown can't wreck the plan.`);
  }
  if (profile.monthlyExpensesInr || profile.monthlyExpensesUsd) {
    const cashFloorInr = (profile.monthlyExpensesInr ?? 0) * 6
      + (profile.monthlyExpensesUsd ?? 0) * 6 / USD_PER_INR;
    rationale.push(`Liquidity floor: keep at least ₹${Math.round(cashFloorInr).toLocaleString("en-IN")} in cash (6× monthly expenses).`);
  }

  return { allocation: alloc, rationale };
}

// Compute current allocation from asset_holdings rows + trading positions
export type HoldingRow = {
  asset_class: AssetClass;
  market_value_inr: number | null;
  market_value_usd: number | null;
};

export function currentAllocation(
  holdings: HoldingRow[],
  tradingInr: number,
  tradingUsd: number,
  cashInr: number,
  cashUsd: number,
): { allocation: AllocationMap; totalInr: number } {
  const buckets: AllocationMap = {
    public_equity: 0,
    private_companies: 0,
    debt: 0,
    real_estate: 0,
    bullion: 0,
    alternates: 0,
    crypto: 0,
    art: 0,
    cash: 0,
  };

  // 1) sum manual holdings
  for (const h of holdings) {
    const v = (h.market_value_inr ?? 0) + (h.market_value_usd ?? 0) / USD_PER_INR;
    if (ASSET_CLASSES.includes(h.asset_class)) {
      buckets[h.asset_class] += v;
    }
  }

  // 2) add trading_positions to public_equity
  buckets.public_equity += tradingInr + tradingUsd / USD_PER_INR;

  // 3) add cash
  buckets.cash += cashInr + cashUsd / USD_PER_INR;

  const totalInr = Object.values(buckets).reduce((a, b) => a + b, 0);
  if (totalInr <= 0) {
    return { allocation: buckets, totalInr: 0 };
  }

  for (const k of ASSET_CLASSES) {
    buckets[k] = buckets[k] / totalInr;
  }
  return { allocation: buckets, totalInr };
}

// Delta in percentage points, positive = need more of this class
export function allocationDelta(
  current: AllocationMap,
  target: AllocationMap,
): Record<AssetClass, number> {
  const out: Record<string, number> = {};
  for (const k of ASSET_CLASSES) {
    out[k] = (target[k] ?? 0) - (current[k] ?? 0);
  }
  return out as Record<AssetClass, number>;
}

// Format: `+5.2pp` / `-3.1pp`
export function fmtPp(x: number): string {
  const pp = x * 100;
  const sign = pp >= 0 ? "+" : "";
  return `${sign}${pp.toFixed(1)}pp`;
}
