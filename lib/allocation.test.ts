import { describe, it, expect } from "vitest";
import {
  targetAllocation,
  currentAllocation,
  allocationDelta,
  fmtPp,
} from "./allocation";
import { ASSET_CLASSES } from "./assets";

describe("targetAllocation()", () => {
  it("allocates 60%+ equity for a 30-year-old balanced investor", () => {
    const { allocation } = targetAllocation({
      age: 30,
      riskTolerance: 3,
      taxResidence: "IN",
      monthlyExpensesInr: 80000,
      monthlyExpensesUsd: null,
      retireTargetAge: 55,
    });
    const equityTotal = allocation.public_equity + allocation.private_companies;
    expect(equityTotal).toBeGreaterThan(0.55);
  });

  it("cuts equity for a 65-year-old conservative investor", () => {
    const { allocation } = targetAllocation({
      age: 65,
      riskTolerance: 1,
      taxResidence: "IN",
      monthlyExpensesInr: 100000,
      monthlyExpensesUsd: null,
      retireTargetAge: 65,
    });
    const equityTotal = allocation.public_equity + allocation.private_companies;
    expect(equityTotal).toBeLessThan(0.55);
    // Debt should be substantial
    expect(allocation.debt).toBeGreaterThan(0.15);
  });

  it("only includes crypto for aggressive investors", () => {
    const conservative = targetAllocation({
      age: 35, riskTolerance: 2, taxResidence: "IN",
      monthlyExpensesInr: null, monthlyExpensesUsd: null, retireTargetAge: 55,
    });
    const aggressive = targetAllocation({
      age: 35, riskTolerance: 5, taxResidence: "IN",
      monthlyExpensesInr: null, monthlyExpensesUsd: null, retireTargetAge: 55,
    });
    expect(conservative.allocation.crypto).toBe(0);
    expect(aggressive.allocation.crypto).toBeGreaterThan(0);
  });

  it("tilts real estate higher for India residents", () => {
    const india = targetAllocation({
      age: 40, riskTolerance: 3, taxResidence: "IN",
      monthlyExpensesInr: 100000, monthlyExpensesUsd: null, retireTargetAge: 60,
    });
    const us = targetAllocation({
      age: 40, riskTolerance: 3, taxResidence: "US",
      monthlyExpensesInr: null, monthlyExpensesUsd: 5000, retireTargetAge: 60,
    });
    expect(india.allocation.real_estate).toBeGreaterThan(us.allocation.real_estate);
    expect(india.allocation.bullion).toBeGreaterThan(us.allocation.bullion);
  });

  it("always sums to 1 (±0.01)", () => {
    const samples = [
      { age: 25, riskTolerance: 5, taxResidence: "IN", monthlyExpensesInr: 30000 },
      { age: 45, riskTolerance: 3, taxResidence: "US", monthlyExpensesUsd: 4000 },
      { age: 70, riskTolerance: 1, taxResidence: "IN", monthlyExpensesInr: 150000 },
    ];
    for (const s of samples) {
      const { allocation } = targetAllocation({
        age: s.age,
        riskTolerance: s.riskTolerance,
        taxResidence: s.taxResidence,
        monthlyExpensesInr: (s as any).monthlyExpensesInr ?? null,
        monthlyExpensesUsd: (s as any).monthlyExpensesUsd ?? null,
        retireTargetAge: 60,
      });
      const sum = Object.values(allocation).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 2);
    }
  });
});

describe("currentAllocation()", () => {
  it("returns zeros when there are no holdings and no trading", () => {
    const { allocation, totalInr } = currentAllocation([], 0, 0, 0, 0);
    expect(totalInr).toBe(0);
    for (const k of ASSET_CLASSES) {
      expect(allocation[k]).toBe(0);
    }
  });

  it("rolls trading positions into public_equity", () => {
    const { allocation, totalInr } = currentAllocation(
      [],
      50_000, // trading INR
      0,
      0,
      0,
    );
    expect(totalInr).toBe(50_000);
    expect(allocation.public_equity).toBeCloseTo(1, 5);
  });

  it("rolls cash correctly when USD is the only cash", () => {
    const { allocation } = currentAllocation([], 0, 0, 0, 1200);  // $1200 cash
    expect(allocation.cash).toBeCloseTo(1, 5);
  });
});

describe("allocationDelta()", () => {
  it("returns signed pp deltas per class", () => {
    const current = { public_equity: 0.3, debt: 0.3, real_estate: 0.4,
      bullion: 0, crypto: 0, art: 0, alternates: 0, private_companies: 0, cash: 0 };
    const target  = { public_equity: 0.5, debt: 0.2, real_estate: 0.15,
      bullion: 0.05, crypto: 0.02, art: 0, alternates: 0.03, private_companies: 0.05, cash: 0 };
    const delta = allocationDelta(current, target);
    expect(delta.public_equity).toBeCloseTo(0.2, 5);
    expect(delta.debt).toBeCloseTo(-0.1, 5);
    expect(delta.real_estate).toBeCloseTo(-0.25, 5);
  });
});

describe("fmtPp()", () => {
  it("formats +5.2pp / -3.1pp", () => {
    expect(fmtPp(0.052)).toBe("+5.2pp");
    expect(fmtPp(-0.031)).toBe("-3.1pp");
    expect(fmtPp(0)).toBe("+0.0pp");
  });
});
