import type { ScoreResult } from "@/lib/scoring";
import { fmtPct } from "@/lib/fmt";

export default function AdvancedPanel({ score, currency }: { score: ScoreResult; currency: string | null }) {
  const { piotroski, altmanZ, dcf, moat, lynchPEG } = score.advanced;

  const moatStrengthChip =
    moat.strength === "wide"
      ? "chip-strong"
      : moat.strength === "narrow"
        ? "chip-buy"
        : "chip-avoid";

  const zoneChip =
    altmanZ.zone === "safe"
      ? "chip-strong"
      : altmanZ.zone === "grey"
        ? "chip-hold"
        : altmanZ.zone === "distress"
          ? "chip-avoid"
          : "chip-hold";

  const pegChip =
    lynchPEG.verdict === "undervalued"
      ? "chip-strong"
      : lynchPEG.verdict === "fair"
        ? "chip-buy"
        : lynchPEG.verdict === "overvalued"
          ? "chip-avoid"
          : "chip-hold";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Advanced signals</h3>
        <span className="text-[11px] uppercase tracking-wide text-foreground/40">
          Peer-reviewed research frameworks
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel
          title="Piotroski F-Score"
          subtitle="Financial strength, 0–9 (Piotroski 2000)"
        >
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{piotroski.score}</span>
            <span className="text-sm text-foreground/60 mb-1">/ {piotroski.max}</span>
            <span className={`chip ${piotroski.score >= 7 ? "chip-strong" : piotroski.score >= 4 ? "chip-hold" : "chip-avoid"}`}>
              {piotroski.score >= 7 ? "Strong" : piotroski.score >= 4 ? "Mixed" : "Weak"}
            </span>
          </div>
          <p className="text-xs text-foreground/60 mt-2">
            Binary signals across profitability, leverage, liquidity, and efficiency. 3 YoY-comparison
            signals are approximated from a single snapshot.
          </p>
        </Panel>

        <Panel
          title="Altman Z-Score"
          subtitle="Bankruptcy probability (Altman 1968)"
        >
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {altmanZ.score != null ? altmanZ.score.toFixed(2) : "—"}
            </span>
            <span className={`chip ${zoneChip}`}>
              {altmanZ.zone ?? "unknown"}
            </span>
          </div>
          <p className="text-xs text-foreground/60 mt-2">
            &gt;2.99 safe · 1.81–2.99 grey · &lt;1.81 distress. Approximated with available ratios; formal
            Z needs book-value line items.
          </p>
        </Panel>

        <Panel title="DCF fair value" subtitle="Two-stage discounted cashflow">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {dcf.fairValue != null
                ? `${currency === "INR" ? "₹" : "$"}${dcf.fairValue.toLocaleString()}`
                : "—"}
            </span>
            <span
              className={`chip ${
                dcf.marginOfSafety == null
                  ? "chip-hold"
                  : dcf.marginOfSafety > 0.15
                    ? "chip-strong"
                    : dcf.marginOfSafety > 0
                      ? "chip-buy"
                      : "chip-avoid"
              }`}
            >
              {dcf.marginOfSafety != null
                ? `${fmtPct(dcf.marginOfSafety, 1)} MoS`
                : "n/a"}
            </span>
          </div>
          <p className="text-xs text-foreground/60 mt-2">
            Growth {fmtPct(dcf.assumptions.growthRate, 1)} / term{" "}
            {fmtPct(dcf.assumptions.terminalGrowth, 1)} / discount{" "}
            {fmtPct(dcf.assumptions.discountRate, 1)}. Conservative defaults.
          </p>
        </Panel>

        <Panel title="Moat classification" subtitle="Dorsey's 5-moat framework">
          <div className="flex items-end gap-2">
            <span className="text-xl font-semibold capitalize">
              {moat.type.replace(/_/g, " ")}
            </span>
            <span className={`chip ${moatStrengthChip}`}>{moat.strength}</span>
          </div>
          <p className="text-xs text-foreground/60 mt-2">{moat.rationale}</p>
        </Panel>

        <Panel title="PEG · Lynch" subtitle="Price/Earnings-to-Growth">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {lynchPEG.peg != null ? lynchPEG.peg.toFixed(2) : "—"}
            </span>
            <span className={`chip ${pegChip}`}>{lynchPEG.verdict ?? "n/a"}</span>
          </div>
          <p className="text-xs text-foreground/60 mt-2">
            &lt;1 undervalued · 1–2 fair · &gt;2 expensive (Lynch heuristic).
          </p>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="text-sm font-semibold">{title}</div>
      {subtitle && <div className="text-[11px] text-foreground/60 mb-2">{subtitle}</div>}
      <div className="mt-1">{children}</div>
    </div>
  );
}
