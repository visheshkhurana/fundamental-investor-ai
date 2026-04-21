import { describe, it, expect } from "vitest";
import { entrySignal, exitSignal, entryVerdictLabel } from "./signals";
import type { ScoreResult } from "./scoring";

// Synthetic ScoreResult — signals.ts only reads total, verdict, and .advanced
function fakeScore(overrides: Partial<{
  total: number;
  verdict: ScoreResult["verdict"];
  piotroski: number;
  altmanZone: "safe" | "grey" | "distress";
  peg: number | null;
  marginOfSafety: number | null;
  moat: "wide" | "narrow" | "none";
}> = {}): ScoreResult {
  return {
    total: overrides.total ?? 7,
    verdict: overrides.verdict ?? "buy",
    byCategory: { macro: 7, industry: 7, company: 7, valuation: 7, triggers: 7 },
    weights: { macro: 0.1, industry: 0.2, company: 0.4, valuation: 0.2, triggers: 0.1 },
    items: [],
    advanced: {
      piotroski: { score: overrides.piotroski ?? 7, max: 9, signals: {} },
      altmanZ: { score: 3, zone: overrides.altmanZone ?? "safe" },
      dcf: {
        fairValue: 100,
        marginOfSafety: overrides.marginOfSafety ?? 0.2,
        assumptions: { growthRate: 0.1, terminalGrowth: 0.03, discountRate: 0.1 },
      },
      moat: {
        type: "intangibles",
        strength: overrides.moat ?? "wide",
        rationale: "test",
      },
      lynchPEG: { peg: overrides.peg ?? 0.8, verdict: "undervalued" },
    },
  };
}

describe("entrySignal()", () => {
  it("hits strong_buy when all four factors green", () => {
    const s = entrySignal(fakeScore({
      total: 8.5,
      verdict: "strong_buy",
      piotroski: 8,
      altmanZone: "safe",
      peg: 0.8,
      marginOfSafety: 0.3,
      moat: "wide",
    }));
    expect(s.verdict).toBe("strong_buy");
    expect(s.points).toBeGreaterThanOrEqual(4);
  });

  it("drops to wait/avoid when fundamentals are poor", () => {
    const s = entrySignal(fakeScore({
      total: 3.5,
      verdict: "avoid",
      piotroski: 2,
      altmanZone: "distress",
      peg: 4,
      marginOfSafety: -0.5,
      moat: "none",
    }));
    expect(["wait", "avoid"]).toContain(s.verdict);
  });

  it("always returns 4 factors", () => {
    const s = entrySignal(fakeScore());
    expect(s.factors.length).toBe(4);
  });

  it("verdict label round-trips", () => {
    expect(entryVerdictLabel("strong_buy")).toMatch(/strong/i);
    expect(entryVerdictLabel("enter")).toBe("Enter");
  });
});

describe("exitSignal()", () => {
  it("returns null when user holds zero shares", () => {
    const s = exitSignal(fakeScore(), { heldQty: 0, positionValueUsd: 0, accountNavUsd: 10000 });
    expect(s).toBeNull();
  });

  it("fires thesis-break + distress triggers on a broken stock", () => {
    const s = exitSignal(
      fakeScore({ total: 3.5, verdict: "avoid", altmanZone: "distress" }),
      { heldQty: 100, positionValueUsd: 5000, accountNavUsd: 50000 },
    );
    expect(s).not.toBeNull();
    const thesis = s!.triggers.find((t) => t.id === "thesis")!;
    const distress = s!.triggers.find((t) => t.id === "distress")!;
    expect(thesis.fired).toBe(true);
    expect(distress.fired).toBe(true);
    expect(s!.action).toBe("sell");
  });

  it("fires concentration trigger when position > 20% of NAV", () => {
    const s = exitSignal(fakeScore(), {
      heldQty: 100,
      positionValueUsd: 25000,
      accountNavUsd: 100000, // 25% — over threshold
    });
    expect(s).not.toBeNull();
    const conc = s!.triggers.find((t) => t.id === "concentration")!;
    expect(conc.fired).toBe(true);
  });

  it("reports hold when nothing is firing", () => {
    const s = exitSignal(
      fakeScore({ total: 7.5, verdict: "buy", altmanZone: "safe", peg: 1.2, marginOfSafety: 0.1 }),
      { heldQty: 100, positionValueUsd: 5000, accountNavUsd: 100000 },
    );
    expect(s).not.toBeNull();
    expect(s!.action).toBe("hold");
  });
});
