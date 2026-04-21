import { describe, it, expect } from "vitest";
import { rankIdea, reasonTags, type ScoredCandidate, type UserTilt } from "./ideas";

const base: ScoredCandidate = {
  market: "NSE",
  symbol: "HDFCBANK",
  name: "HDFC Bank",
  sector: "Financial Services",
  industry: "Private Banking",
  total_score: 7.5,
  verdict: "buy",
  prev_score: null,
  moat_strength: "wide",
  piotroski: 7,
  peg: 0.9,
  pe: 20,
};

function tilt(overrides: Partial<UserTilt> = {}): UserTilt {
  return {
    ownedSectors: new Set(),
    underweightSectors: new Set(),
    dismissedTickers: new Set(),
    ownedTickers: new Set(),
    preferredStyles: new Set(),
    hasPositiveNews: () => false,
    ...overrides,
  };
}

describe("rankIdea()", () => {
  it("returns -Infinity for owned tickers (never recommend what you hold)", () => {
    const t = tilt({ ownedTickers: new Set(["NSE/HDFCBANK"]) });
    expect(rankIdea(base, t)).toBe(-Infinity);
  });

  it("returns -Infinity for dismissed tickers", () => {
    const t = tilt({ dismissedTickers: new Set(["NSE/HDFCBANK"]) });
    expect(rankIdea(base, t)).toBe(-Infinity);
  });

  it("gives strong_buy a +2 bonus over hold", () => {
    const strong = rankIdea({ ...base, verdict: "strong_buy" }, tilt());
    const hold = rankIdea({ ...base, verdict: "hold" }, tilt());
    expect(strong).toBeGreaterThan(hold);
    expect(strong - hold).toBeCloseTo(2, 1);
  });

  it("gives diversifier bonus for underweight sectors", () => {
    const withBonus = rankIdea(base, tilt({
      underweightSectors: new Set(["Financial Services"]),
    }));
    const without = rankIdea(base, tilt());
    expect(withBonus).toBeGreaterThan(without);
  });

  it("penalizes overweight sectors (owned same sector)", () => {
    const overweight = rankIdea(base, tilt({
      ownedSectors: new Set(["Financial Services"]),
    }));
    const neutral = rankIdea(base, tilt());
    expect(overweight).toBeLessThan(neutral);
  });

  it("rewards positive news tailwind", () => {
    const withNews = rankIdea(base, tilt({
      hasPositiveNews: (m, s) => m === "NSE" && s === "HDFCBANK",
    }));
    const without = rankIdea(base, tilt());
    expect(withNews).toBeGreaterThan(without);
  });

  it("rewards score uptick", () => {
    const uptick = rankIdea({ ...base, prev_score: 6.0 }, tilt());  // +1.5 jump
    const flat   = rankIdea({ ...base, prev_score: 7.5 }, tilt());
    expect(uptick).toBeGreaterThan(flat);
  });
});

describe("reasonTags()", () => {
  it("tags strong-buy verdicts", () => {
    const tags = reasonTags({ ...base, verdict: "strong_buy" }, tilt());
    expect(tags).toContain("strong-buy");
  });

  it("tags diversifiers", () => {
    const tags = reasonTags(base, tilt({
      underweightSectors: new Set(["Financial Services"]),
    }));
    expect(tags).toContain("diversifier");
  });

  it("tags PEG-undervalued picks (PEG < 1)", () => {
    const tags = reasonTags({ ...base, peg: 0.6 }, tilt());
    expect(tags).toContain("peg-undervalued");
  });

  it("tags wide moats", () => {
    const tags = reasonTags({ ...base, moat_strength: "wide" }, tilt());
    expect(tags).toContain("wide-moat");
  });

  it("tags score-uptick when prev < current - 0.5", () => {
    const tags = reasonTags({ ...base, prev_score: 6.5 }, tilt());
    expect(tags).toContain("score-uptick");
  });
});
