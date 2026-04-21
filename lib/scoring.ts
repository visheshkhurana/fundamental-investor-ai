// Scoring engine — translates raw fundamentals into an investment decision.
// Built on top of research frameworks I trust, cited inline:
//   • Buffett / Munger: economic moat, owner earnings (FCF as proxy)
//   • Peter Lynch: PEG ratio, earnings growth
//   • Pat Dorsey: 5 moat sources (network, scale, switching, brand/intangibles, regulatory)
//   • Joseph Piotroski (2000): F-Score — 9 binary signals of financial strength
//   • Edward Altman (1968): Z-Score — bankruptcy probability
//   • Benjamin Graham: margin of safety via DCF fair value
//
// This file is pure — it takes fundamentals, returns a decision. Deterministic,
// auditable, and cheap to re-run whenever data updates.

import type { Fundamentals } from "./yahoo";

export type Category = "macro" | "industry" | "company" | "valuation" | "triggers";
export type ItemStatus = "pass" | "fail" | "neutral" | "missing";

export type ChecklistItem = {
  id: string;
  category: Category;
  title: string;
  description: string;
  weight: number;
  status: ItemStatus;
  value: string;
  detail?: string;
};

export type MoatType =
  | "network_effect"
  | "scale_cost"
  | "switching_cost"
  | "intangibles"
  | "regulatory"
  | "none";

export type MoatAssessment = {
  type: MoatType;
  strength: "wide" | "narrow" | "none";
  rationale: string;
};

export type ScoreResult = {
  total: number; // 0..10
  verdict: "strong_buy" | "buy" | "hold" | "avoid";
  byCategory: Record<Category, number>; // 0..10 per category
  weights: Record<Category, number>;
  items: ChecklistItem[];
  advanced: {
    piotroski: { score: number; max: number; signals: Record<string, boolean | null> };
    altmanZ: { score: number | null; zone: "safe" | "grey" | "distress" | null };
    dcf: {
      fairValue: number | null;
      marginOfSafety: number | null; // (fair - price) / fair
      assumptions: { growthRate: number; terminalGrowth: number; discountRate: number };
    };
    moat: MoatAssessment;
    lynchPEG: { peg: number | null; verdict: "undervalued" | "fair" | "overvalued" | null };
  };
};

// Default category weights from the PRD — can be user-overridden later.
export const DEFAULT_WEIGHTS: Record<Category, number> = {
  macro: 0.1,
  industry: 0.2,
  company: 0.4,
  valuation: 0.2,
  triggers: 0.1,
};

// -------- helpers --------
const pass = (cond: boolean): ItemStatus => (cond ? "pass" : "fail");

function toScoreOutOf10(passed: number, total: number): number {
  if (total === 0) return 5;
  return Number(((passed / total) * 10).toFixed(1));
}

function verdictFor(total: number): ScoreResult["verdict"] {
  if (total >= 8) return "strong_buy";
  if (total >= 6) return "buy";
  if (total >= 4) return "hold";
  return "avoid";
}

// -------- Piotroski F-Score --------
// 9 signals, each worth 1 point. 8-9 = strong, 0-2 = weak.
// Some inputs (current-vs-prior comparisons) aren't available from a single
// Yahoo snapshot. We compute what we can; missing signals are null (don't count).
function piotroski(f: Fundamentals) {
  const signals: Record<string, boolean | null> = {
    positive_net_income: (f.profitMargin ?? 0) > 0,
    positive_roa: (f.roa ?? 0) > 0,
    positive_fcf: (f.freeCashflow ?? 0) > 0,
    fcf_exceeds_net_income:
      f.freeCashflow != null && f.totalRevenue != null && f.profitMargin != null
        ? f.freeCashflow > f.totalRevenue * f.profitMargin
        : null,
    low_leverage: f.debtToEquity != null ? f.debtToEquity < 100 : null, // Yahoo D/E is in percent
    liquidity_current_ratio: f.currentRatio != null ? f.currentRatio >= 1 : null,
    // The remaining 3 signals need year-over-year comparisons we don't pull in MVP:
    roa_improving: null,
    margins_improving: null,
    no_new_shares: null,
  };
  const vals = Object.values(signals);
  const known = vals.filter((v) => v !== null) as boolean[];
  const trueCount = known.filter((v) => v).length;
  // Scale to /9 by assuming unknowns track the known ratio (conservative).
  const projected = Math.round((trueCount / (known.length || 1)) * 9);
  return { score: projected, max: 9, signals };
}

// -------- Altman Z-Score (original, for manufacturing-style firms) --------
// We approximate missing pieces. Formally:
//   Z = 1.2*(WC/TA) + 1.4*(RE/TA) + 3.3*(EBIT/TA) + 0.6*(MV_eq/TL) + 1.0*(Sales/TA)
// Zones: >2.99 safe, 1.81-2.99 grey, <1.81 distress.
// We only have partial info, so we approximate using available ratios.
function altmanZ(f: Fundamentals): { score: number | null; zone: ScoreResult["advanced"]["altmanZ"]["zone"] } {
  const mCap = f.marketCap;
  const debt = f.totalDebt;
  const cash = f.totalCash;
  const revenue = f.totalRevenue;
  const opMargin = f.operatingMargin;
  if (mCap == null || debt == null || revenue == null || opMargin == null)
    return { score: null, zone: null };
  const totalLiabilities = debt; // approximation
  const totalAssets = mCap + debt - (cash ?? 0); // approximation: EV-style
  if (totalAssets <= 0) return { score: null, zone: null };
  const ebit = revenue * opMargin;
  // Approximate working capital/retained earnings components with reasonable defaults
  const t1 = 1.2 * 0.1; // assume WC/TA ~ 10% (varies)
  const t2 = 1.4 * 0.3; // assume RE/TA ~ 30%
  const t3 = 3.3 * (ebit / totalAssets);
  const t4 = 0.6 * (mCap / Math.max(totalLiabilities, 1));
  const t5 = 1.0 * (revenue / totalAssets);
  const z = Number((t1 + t2 + t3 + t4 + t5).toFixed(2));
  // Sanity check — when approximation goes sideways (e.g., massive market-cap-to-
  // debt ratios inflate the t4 term beyond usable bounds) suppress the score.
  if (!Number.isFinite(z) || z < -5 || z > 25) return { score: null, zone: null };
  const zone = z > 2.99 ? "safe" : z > 1.81 ? "grey" : "distress";
  return { score: z, zone };
}

// -------- DCF fair value --------
// A two-stage DCF on free cash flow. Defaults are deliberately conservative.
function dcf(f: Fundamentals, quotePrice: number | null) {
  const fcf = f.freeCashflow;
  const mCap = f.marketCap;
  if (!fcf || !mCap || fcf <= 0)
    return { fairValue: null, marginOfSafety: null, assumptions: { growthRate: 0.1, terminalGrowth: 0.03, discountRate: 0.1 } };
  // Infer growth from revenue/earnings growth, capped.
  const infer = f.earningsGrowth ?? f.revenueGrowth ?? 0.08;
  const growthRate = Math.max(0.02, Math.min(0.18, infer));
  const discount = 0.1;
  const terminal = 0.03;
  let present = 0;
  let cashflow = fcf;
  // 10-year explicit projection
  for (let y = 1; y <= 10; y++) {
    cashflow = cashflow * (1 + growthRate);
    present += cashflow / Math.pow(1 + discount, y);
  }
  // Terminal value (Gordon growth) discounted to today
  const terminalValue = (cashflow * (1 + terminal)) / (discount - terminal);
  present += terminalValue / Math.pow(1 + discount, 10);
  // Fair equity value ≈ DCF of firm (ignoring net-debt adj for simplicity here)
  const netDebt = (f.totalDebt ?? 0) - (f.totalCash ?? 0);
  const fairEquity = present - netDebt;
  // Per-share fair: need shares outstanding ≈ marketCap / price
  if (!quotePrice || quotePrice <= 0) return { fairValue: null, marginOfSafety: null, assumptions: { growthRate, terminalGrowth: terminal, discountRate: discount } };
  const shares = mCap / quotePrice;
  const fairPerShare = fairEquity / Math.max(shares, 1);
  if (!Number.isFinite(fairPerShare) || fairPerShare <= 0) return { fairValue: null, marginOfSafety: null, assumptions: { growthRate, terminalGrowth: terminal, discountRate: discount } };
  // Sanity check — if our fair-value estimate is more than 5x off in either
  // direction, it's the approximation failing, not a mispricing worth flagging.
  const ratio = fairPerShare / quotePrice;
  if (ratio < 0.2 || ratio > 5) {
    return { fairValue: null, marginOfSafety: null, assumptions: { growthRate, terminalGrowth: terminal, discountRate: discount } };
  }
  const margin = (fairPerShare - quotePrice) / fairPerShare;
  return {
    fairValue: Number(fairPerShare.toFixed(2)),
    marginOfSafety: Number(margin.toFixed(3)),
    assumptions: { growthRate, terminalGrowth: terminal, discountRate: discount },
  };
}

// -------- Moat classification (Dorsey) --------
// Heuristic: classify by industry + margins + scale. Mostly a hint; users can override.
function classifyMoat(f: Fundamentals): MoatAssessment {
  const opMargin = f.operatingMargin ?? 0;
  const ind = (f.industry || "").toLowerCase();
  const sec = (f.sector || "").toLowerCase();

  // Network effects
  if (/internet|social|platform|exchange|payment|credit services/.test(ind + sec))
    return { type: "network_effect", strength: opMargin > 0.25 ? "wide" : "narrow", rationale: "Platform/marketplace dynamics favor incumbents; users and suppliers reinforce each other." };

  // Switching costs
  if (/software|application software|bank|insurance|data|erp|crm/.test(ind))
    return { type: "switching_cost", strength: opMargin > 0.2 ? "wide" : "narrow", rationale: "Customers face meaningful friction to change providers (integrations, retraining, compliance)." };

  // Intangibles / brand
  if (/beverages|consumer products|luxury|pharma|drug manufacturers|personal products|tobacco|apparel/.test(ind))
    return { type: "intangibles", strength: opMargin > 0.2 ? "wide" : "narrow", rationale: "Brand, patents, or trademark rights command pricing power." };

  // Regulatory
  if (/utilities|regulated|telecom services|airports|defense/.test(ind + sec))
    return { type: "regulatory", strength: "narrow", rationale: "Regulation, licences, or franchise rights limit competition." };

  // Scale/cost advantages
  if (/retail|logistics|auto|oil & gas|energy|steel|cement|materials/.test(ind + sec))
    return { type: "scale_cost", strength: opMargin > 0.15 ? "narrow" : "none", rationale: "Scale-driven unit cost advantages matter, but cyclicality limits durability." };

  return {
    type: opMargin > 0.25 ? "intangibles" : "none",
    strength: opMargin > 0.3 ? "narrow" : "none",
    rationale:
      opMargin > 0.25
        ? "Unusually high margins suggest some competitive advantage — classification uncertain."
        : "No clear moat detected from sector/margins.",
  };
}

// -------- Lynch PEG interpretation --------
function lynchPeg(f: Fundamentals) {
  const peg = f.peg;
  if (peg == null) return { peg: null, verdict: null };
  if (peg < 1) return { peg, verdict: "undervalued" as const };
  if (peg < 2) return { peg, verdict: "fair" as const };
  return { peg, verdict: "overvalued" as const };
}

// -------- The main scorer --------
export function scoreStock(
  f: Fundamentals,
  quotePrice: number | null,
  ctx: { macroHint?: "supportive" | "neutral" | "adverse" } = {}
): ScoreResult {
  const piotro = piotroski(f);
  const altman = altmanZ(f);
  const moat = classifyMoat(f);
  const valDcf = dcf(f, quotePrice);
  const peg = lynchPeg(f);
  const macro = ctx.macroHint ?? "neutral";

  const items: ChecklistItem[] = [];

  // ---- Macro (10%) ----
  items.push({
    id: "macro_env",
    category: "macro",
    title: "Macro environment",
    description: "Rates, inflation, currency, GDP direction favourable for equities",
    weight: 1,
    status: macro === "supportive" ? "pass" : macro === "adverse" ? "fail" : "neutral",
    value: macro,
  });

  // ---- Industry (20%) ----
  items.push({
    id: "industry_growth",
    category: "industry",
    title: "Sector participation",
    description: "Company operates in a clearly identifiable sector/industry",
    weight: 1,
    status: f.sector ? "pass" : "missing",
    value: f.sector ?? "Unknown",
    detail: f.industry ?? undefined,
  });
  items.push({
    id: "industry_moat",
    category: "industry",
    title: "Industry supports moats",
    description:
      "Industry structure allows durable competitive advantages (network, switching, scale, intangibles, or regulatory)",
    weight: 1,
    status: moat.type === "none" ? "fail" : "pass",
    value: `${moat.strength} · ${moat.type.replace(/_/g, " ")}`,
    detail: moat.rationale,
  });

  // ---- Company (40%) — the bulk of scoring ----
  items.push({
    id: "rev_growth",
    category: "company",
    title: "Revenue growth > 10% YoY",
    description: "Top-line growth signals demand strength",
    weight: 1,
    status: f.revenueGrowth != null ? pass(f.revenueGrowth >= 0.1) : "missing",
    value: f.revenueGrowth != null ? `${(f.revenueGrowth * 100).toFixed(1)}%` : "—",
  });
  items.push({
    id: "op_margin",
    category: "company",
    title: "Operating margin > 10%",
    description: "Operational profitability at scale",
    weight: 1,
    status: f.operatingMargin != null ? pass(f.operatingMargin >= 0.1) : "missing",
    value: f.operatingMargin != null ? `${(f.operatingMargin * 100).toFixed(1)}%` : "—",
  });
  items.push({
    id: "roe",
    category: "company",
    title: "ROE > 15% (Buffett threshold)",
    description: "Capital compounds efficiently",
    weight: 1,
    status: f.roe != null ? pass(f.roe >= 0.15) : "missing",
    value: f.roe != null ? `${(f.roe * 100).toFixed(1)}%` : "—",
  });
  items.push({
    id: "de_low",
    category: "company",
    title: "Debt/Equity < 1.0",
    description: "Balance sheet resilient to shocks",
    weight: 1,
    status: f.debtToEquity != null ? pass(f.debtToEquity < 100) : "missing",
    value: f.debtToEquity != null ? `${(f.debtToEquity / 100).toFixed(2)}` : "—",
  });
  items.push({
    id: "fcf_positive",
    category: "company",
    title: "Positive free cash flow",
    description: "Business self-funds growth and dividends (Buffett owner earnings)",
    weight: 1,
    status: f.freeCashflow != null ? pass(f.freeCashflow > 0) : "missing",
    value: f.freeCashflow != null ? `${(f.freeCashflow / 1e9).toFixed(2)}B` : "—",
  });
  items.push({
    id: "piotroski",
    category: "company",
    title: "Piotroski F-Score ≥ 7",
    description: "Nine-point financial strength score (Piotroski 2000)",
    weight: 1,
    status: pass(piotro.score >= 7),
    value: `${piotro.score} / 9`,
    detail:
      "Signals: positive net income, positive ROA, positive FCF, FCF > accruals, low leverage, adequate liquidity (+3 YoY comparisons we approximate in MVP)",
  });
  items.push({
    id: "altman",
    category: "company",
    title: "Altman Z-Score in safe zone",
    description: "Bankruptcy risk low (Altman 1968: >2.99 = safe, <1.81 = distress)",
    weight: 1,
    status:
      altman.score == null ? "missing" : altman.zone === "safe" ? "pass" : altman.zone === "distress" ? "fail" : "neutral",
    value: altman.score != null ? `Z=${altman.score} (${altman.zone})` : "—",
  });
  items.push({
    id: "moat",
    category: "company",
    title: "Durable moat identified",
    description: "Dorsey's 5 moat types: network, switching, intangibles, scale, regulatory",
    weight: 1,
    status: moat.strength === "none" ? "fail" : "pass",
    value: `${moat.strength} · ${moat.type.replace(/_/g, " ")}`,
    detail: moat.rationale,
  });

  // ---- Valuation (20%) ----
  items.push({
    id: "pe",
    category: "valuation",
    title: "P/E reasonable (< 30)",
    description: "Not paying an absurd premium",
    weight: 1,
    status: f.peTrailing != null ? pass(f.peTrailing > 0 && f.peTrailing < 30) : "missing",
    value: f.peTrailing != null ? f.peTrailing.toFixed(1) : "—",
  });
  items.push({
    id: "peg",
    category: "valuation",
    title: "PEG < 1 (Lynch)",
    description: "Growth-adjusted valuation attractive",
    weight: 1,
    status: peg.peg != null ? pass(peg.peg < 1 && peg.peg > 0) : "missing",
    value: peg.peg != null ? peg.peg.toFixed(2) : "—",
  });
  items.push({
    id: "ev_ebitda",
    category: "valuation",
    title: "EV/EBITDA < 15",
    description: "Enterprise multiple in sane range",
    weight: 1,
    status: f.evToEbitda != null ? pass(f.evToEbitda > 0 && f.evToEbitda < 15) : "missing",
    value: f.evToEbitda != null ? f.evToEbitda.toFixed(1) : "—",
  });
  items.push({
    id: "dcf_margin",
    category: "valuation",
    title: "DCF margin of safety > 15%",
    description: "Fair value from discounted cashflows exceeds price with room to spare",
    weight: 1,
    status:
      valDcf.marginOfSafety == null ? "missing" : pass(valDcf.marginOfSafety > 0.15),
    value:
      valDcf.marginOfSafety != null
        ? `${(valDcf.marginOfSafety * 100).toFixed(1)}% · fair ${valDcf.fairValue}`
        : "—",
    detail: `Assumes growth ${(valDcf.assumptions.growthRate * 100).toFixed(1)}%, terminal ${(valDcf.assumptions.terminalGrowth * 100).toFixed(1)}%, discount ${(valDcf.assumptions.discountRate * 100).toFixed(1)}%`,
  });

  // ---- Triggers (10%) ----
  items.push({
    id: "analyst_bullish",
    category: "triggers",
    title: "Analyst consensus bullish",
    description: "Sell-side skewed to buy/outperform",
    weight: 1,
    status:
      f.recommendationKey == null
        ? "missing"
        : ["strong_buy", "buy"].includes(f.recommendationKey)
          ? "pass"
          : f.recommendationKey === "hold"
            ? "neutral"
            : "fail",
    value: f.recommendationKey ?? "—",
    detail:
      f.numberOfAnalystOpinions != null
        ? `${f.numberOfAnalystOpinions} analysts covering`
        : undefined,
  });
  items.push({
    id: "earnings_growth",
    category: "triggers",
    title: "Earnings growth > 10%",
    description: "Upward earnings momentum",
    weight: 1,
    status: f.earningsGrowth != null ? pass(f.earningsGrowth >= 0.1) : "missing",
    value: f.earningsGrowth != null ? `${(f.earningsGrowth * 100).toFixed(1)}%` : "—",
  });

  // ---- Aggregate ----
  const byCat = {} as Record<Category, number>;
  (Object.keys(DEFAULT_WEIGHTS) as Category[]).forEach((cat) => {
    const group = items.filter((i) => i.category === cat);
    if (group.length === 0) {
      byCat[cat] = 5;
      return;
    }
    const countable = group.filter((i) => i.status !== "missing");
    const passed = group.filter((i) => i.status === "pass").length;
    const neutral = group.filter((i) => i.status === "neutral").length;
    const effectivePass = passed + neutral * 0.5;
    byCat[cat] = toScoreOutOf10(effectivePass, Math.max(countable.length || group.length, 1));
  });

  const total = Number(
    (
      (Object.keys(DEFAULT_WEIGHTS) as Category[])
        .map((c) => byCat[c] * DEFAULT_WEIGHTS[c])
        .reduce((a, b) => a + b, 0)
    ).toFixed(2)
  );

  return {
    total,
    verdict: verdictFor(total),
    byCategory: byCat,
    weights: DEFAULT_WEIGHTS,
    items,
    advanced: {
      piotroski: piotro,
      altmanZ: altman,
      dcf: valDcf,
      moat,
      lynchPEG: peg,
    },
  };
}
