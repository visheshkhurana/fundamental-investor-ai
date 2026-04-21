// Entry / Exit signal engines. Deterministic, pure functions over ScoreResult.
// No LLM calls. No new data. Reads only what's already computed.

import type { ScoreResult } from "./scoring";

// ─────── ENTRY (Tool 6) ───────

export type EntryVerdict = "strong_buy" | "enter" | "accumulate" | "wait" | "avoid";

export type EntryFactor = {
  label: string;
  result: "pass" | "fail" | "neutral";
  weight: number;                   // contribution to score
  value: string;                    // human-readable
};

export type EntrySignal = {
  verdict: EntryVerdict;
  points: number;                   // max 6
  factors: EntryFactor[];
  summary: string;                  // one-line TL;DR
};

const VERDICT_LABEL: Record<EntryVerdict, string> = {
  strong_buy: "Strong Buy",
  enter: "Enter",
  accumulate: "Accumulate (DCA)",
  wait: "Wait",
  avoid: "Avoid",
};
export const entryVerdictLabel = (v: EntryVerdict) => VERDICT_LABEL[v];

export function entrySignal(score: ScoreResult): EntrySignal {
  const factors: EntryFactor[] = [];
  let points = 0;

  // 1. Fundamentals (worth 2 pts)
  const piot = score.advanced.piotroski.score;
  const altman = score.advanced.altmanZ.zone;
  const fundGreen = score.total >= 6.5 && (altman === "safe" || altman == null) && piot >= 6;
  const fundFail  = score.total < 4 || altman === "distress" || piot <= 3;
  factors.push({
    label: "Fundamentals strong",
    result: fundGreen ? "pass" : fundFail ? "fail" : "neutral",
    weight: 2,
    value: `Composite ${score.total.toFixed(1)} · Piotroski ${piot}/9 · Altman ${altman ?? "n/a"}`,
  });
  if (fundGreen) points += 2;
  else if (fundFail) points -= 1;

  // 2. Valuation (worth 2 pts)
  const peg = score.advanced.lynchPEG.peg;
  const mos = score.advanced.dcf.marginOfSafety;
  const valGreen =
    (peg != null && peg > 0 && peg < 1) ||
    (mos != null && mos > 0.15);
  const valFail =
    (peg != null && peg > 2.5) ||
    (mos != null && mos < -0.3);
  const valLabel =
    peg != null
      ? `PEG ${peg.toFixed(2)}${mos != null ? ` · MoS ${(mos * 100).toFixed(0)}%` : ""}`
      : mos != null
        ? `MoS ${(mos * 100).toFixed(0)}%`
        : "—";
  factors.push({
    label: "Valuation attractive",
    result: valGreen ? "pass" : valFail ? "fail" : "neutral",
    weight: 2,
    value: valLabel,
  });
  if (valGreen) points += 2;
  else if (valFail) points -= 1;

  // 3. Moat (worth 1 pt)
  const moat = score.advanced.moat.strength;
  const moatGreen = moat === "wide";
  const moatSoft = moat === "narrow";
  factors.push({
    label: "Durable moat",
    result: moatGreen ? "pass" : moatSoft ? "neutral" : "fail",
    weight: 1,
    value: `${moat} ${score.advanced.moat.type.replace(/_/g, " ")}`,
  });
  if (moatGreen) points += 1;
  else if (moatSoft) points += 0.5;

  // 4. Verdict-bucket adjustment (worth 1 pt — captures aggregate)
  const categoryAdj =
    score.verdict === "strong_buy" ? 1 :
    score.verdict === "buy" ? 0.5 :
    score.verdict === "hold" ? 0 : -1;
  factors.push({
    label: "Framework verdict",
    result: categoryAdj > 0 ? "pass" : categoryAdj < 0 ? "fail" : "neutral",
    weight: 1,
    value: entryVerdictLabel((score.verdict as EntryVerdict) ?? "wait"),
  });
  points += categoryAdj;

  // Verdict thresholds (out of ~6 possible points)
  let verdict: EntryVerdict;
  let summary: string;
  if (score.total >= 8 && points >= 4) {
    verdict = "strong_buy";
    summary = "All four factors green — framework's clearest buy signal.";
  } else if (points >= 3.5) {
    verdict = "enter";
    summary = "Multiple factors supportive. Reasonable entry with normal position sizing.";
  } else if (points >= 2) {
    verdict = "accumulate";
    summary = "Mixed but net positive. Consider DCA over 3–6 months rather than lump-sum.";
  } else if (points >= 0) {
    verdict = "wait";
    summary = "Too many amber signals. Better setups available — wait for one of them to flip.";
  } else {
    verdict = "avoid";
    summary = "Red factors outnumber green. Framework doesn't support a position here.";
  }

  return { verdict, points: Number(points.toFixed(2)), factors, summary };
}

// ─────── EXIT (Tool 7, simplified — no lot history yet) ───────

export type ExitTrigger = {
  id: "thesis" | "valuation" | "concentration" | "distress";
  label: string;
  fired: boolean;
  detail: string;
  severity: "info" | "warn" | "critical";
};

export type ExitSignal = {
  action: "hold" | "trim" | "sell";
  triggers: ExitTrigger[];
  summary: string;
};

export type ExitContext = {
  heldQty: number;              // how many shares/units held (0 if not held)
  positionValueUsd: number;     // value of this position in USD equiv
  accountNavUsd: number;        // total NAV in USD equiv
};

export function exitSignal(score: ScoreResult, ctx: ExitContext): ExitSignal | null {
  if (ctx.heldQty <= 0) return null;   // nothing to exit

  const triggers: ExitTrigger[] = [];

  // Thesis proxy: current framework verdict is bad
  const thesisFired = score.total < 5 || score.verdict === "avoid";
  triggers.push({
    id: "thesis",
    label: "Thesis break",
    fired: thesisFired,
    detail: thesisFired
      ? `Score ${score.total.toFixed(1)} · verdict ${score.verdict} — the reason you bought may no longer hold.`
      : `Score ${score.total.toFixed(1)} · verdict still supportive.`,
    severity: thesisFired ? "critical" : "info",
  });

  // Valuation stretched
  const mos = score.advanced.dcf.marginOfSafety;
  const peg = score.advanced.lynchPEG.peg;
  const valFired =
    (mos != null && mos < -0.3) ||
    (peg != null && peg > 2.5);
  triggers.push({
    id: "valuation",
    label: "Valuation stretched",
    fired: valFired,
    detail: valFired
      ? `DCF MoS ${mos != null ? (mos * 100).toFixed(0) + "%" : "n/a"} · PEG ${peg?.toFixed(2) ?? "—"} — market pricing in aggressive assumptions.`
      : `Valuation inside normal band (MoS ${mos != null ? (mos * 100).toFixed(0) + "%" : "—"}, PEG ${peg?.toFixed(2) ?? "—"}).`,
    severity: valFired ? "warn" : "info",
  });

  // Single-name concentration
  const pct = ctx.accountNavUsd > 0 ? ctx.positionValueUsd / ctx.accountNavUsd : 0;
  const concentrationFired = pct > 0.2;
  triggers.push({
    id: "concentration",
    label: "Position drift",
    fired: concentrationFired,
    detail: concentrationFired
      ? `Position is ${(pct * 100).toFixed(1)}% of NAV (> 20% threshold). Trim back to target weight.`
      : `Position ${(pct * 100).toFixed(1)}% of NAV — within healthy range.`,
    severity: concentrationFired ? "warn" : "info",
  });

  // Balance-sheet distress
  const altman = score.advanced.altmanZ.zone;
  const distressFired = altman === "distress";
  triggers.push({
    id: "distress",
    label: "Balance-sheet distress",
    fired: distressFired,
    detail: distressFired
      ? `Altman Z in the distress zone — elevated bankruptcy risk.`
      : `Altman Z ${altman ?? "n/a"} — solvency signal not firing.`,
    severity: distressFired ? "critical" : "info",
  });

  const firedCount = triggers.filter((t) => t.fired).length;
  const anyCritical = triggers.some((t) => t.fired && t.severity === "critical");

  let action: ExitSignal["action"];
  let summary: string;
  if (firedCount === 0) {
    action = "hold";
    summary = "No exit triggers fired — thesis intact. Hold.";
  } else if (anyCritical && firedCount >= 2) {
    action = "sell";
    summary = "Multiple critical triggers fired. Consider exiting fully (size sales for tax efficiency).";
  } else {
    action = "trim";
    summary = `${firedCount} trigger${firedCount === 1 ? "" : "s"} firing. Consider trimming rather than full sell — let the winners that remain in your book run.`;
  }

  return { action, triggers, summary };
}
