import { describe, it, expect } from "vitest";
import { scoreStock } from "./scoring";
import { strongCompany, distressedCompany, sparseCompany } from "./__fixtures__/fundamentals";

describe("scoreStock()", () => {
  it("produces a strong score for a healthy wide-moat software company", () => {
    const result = scoreStock(strongCompany, 400);
    // Total should land in the 'buy' or 'strong_buy' band
    expect(result.total).toBeGreaterThan(6);
    expect(["buy", "strong_buy"]).toContain(result.verdict);
    expect(result.advanced.piotroski.score).toBeGreaterThanOrEqual(6);
    // Altman Z is either populated (with a valid zone) OR suppressed by the
    // sanity check when mCap/debt ratio blows up. Both are valid behavior.
    const { score, zone } = result.advanced.altmanZ;
    if (score != null) {
      expect(zone).toMatch(/^(safe|grey|distress)$/);
    }
  });

  it("penalizes a distressed airline", () => {
    const result = scoreStock(distressedCompany, 20);
    expect(result.total).toBeLessThan(5);
    expect(["hold", "avoid"]).toContain(result.verdict);
    // Piotroski should be weak
    expect(result.advanced.piotroski.score).toBeLessThanOrEqual(4);
  });

  it("survives a sparse-fundamentals REIT without throwing", () => {
    const result = scoreStock(sparseCompany, 50);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(10);
    // DCF should be suppressed (no FCF)
    expect(result.advanced.dcf.fairValue).toBeNull();
  });

  it("always returns a valid verdict string", () => {
    for (const f of [strongCompany, distressedCompany, sparseCompany]) {
      const r = scoreStock(f, 100);
      expect(["strong_buy", "buy", "hold", "avoid"]).toContain(r.verdict);
    }
  });

  it("produces per-category scores in [0, 10]", () => {
    const r = scoreStock(strongCompany, 400);
    for (const v of Object.values(r.byCategory)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it("category weights sum to 1", () => {
    const r = scoreStock(strongCompany, 400);
    const sum = Object.values(r.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });
});
