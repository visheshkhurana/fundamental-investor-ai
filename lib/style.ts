// Style classifier — uses only the metrics stored in score_cache today:
//   piotroski, peg, pe, de, fcf, moat_strength
// so classification works without live fundamentals fetches.
//
// Priority (highest first): quality > value > growth > balanced.

export type InvestmentStyle = "growth" | "value" | "quality" | "balanced";

export type StyleInputs = {
  pe: number | null | undefined;
  peg: number | null | undefined;
  piotroski: number | null | undefined;
  debtToEquity?: number | null;        // yfinance D/E in percent (e.g., 45 = 0.45x)
  fcf?: number | null;                 // free cash flow, absolute
  moatStrength?: string | null;        // 'wide' | 'narrow' | 'none'
};

export function classifyStyle(x: StyleInputs): InvestmentStyle {
  const pe = x.pe ?? null;
  const peg = x.peg ?? null;
  const piot = x.piotroski ?? null;
  const de = x.debtToEquity ?? null;
  const fcf = x.fcf ?? null;
  const moat = x.moatStrength ?? null;

  // Quality: strong fundamentals + moat + low leverage + positive FCF
  const isQuality =
    piot != null && piot >= 7 &&
    (moat === "wide" || moat === "narrow") &&
    (fcf == null || fcf > 0) &&
    (de == null || de < 80);           // permissive D/E since banks have high D/E

  // Value: cheap on PEG and P/E with solid financial health
  const isValue =
    peg != null && peg > 0 && peg < 1.2 &&
    pe != null && pe > 0 && pe < 20 &&
    piot != null && piot >= 5;

  // Growth: priced for growth — high PEG + high P/E
  const isGrowth =
    peg != null && peg > 1.5 &&
    pe != null && pe > 25;

  if (isQuality) return "quality";
  if (isValue) return "value";
  if (isGrowth) return "growth";
  return "balanced";
}

export const STYLE_COLOR: Record<InvestmentStyle, string> = {
  quality:  "#34d399",
  growth:   "#60a5fa",
  value:    "#f59e0b",
  balanced: "#94a3b8",
};

export const STYLE_LABEL: Record<InvestmentStyle, string> = {
  quality:  "Quality",
  growth:   "Growth",
  value:    "Value",
  balanced: "Balanced",
};
