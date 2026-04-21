// Canonical fundamentals shapes used by unit tests. Tuned to produce
// predictable scoring outcomes so tests remain deterministic.

import type { Fundamentals } from "../yahoo";

// A strong, healthy, wide-moat company
export const strongCompany: Fundamentals = {
  symbol: "STRONG",
  sector: "Technology",
  industry: "Software",
  longBusinessSummary: "A strong hypothetical software company.",
  revenueGrowth: 0.18,
  earningsGrowth: 0.22,
  operatingMargin: 0.35,
  profitMargin: 0.28,
  roe: 0.32,
  roa: 0.18,
  debtToEquity: 25,            // low leverage (Yahoo returns % here)
  totalCash: 50_000_000_000,
  totalDebt: 10_000_000_000,
  currentRatio: 2.1,
  quickRatio: 1.9,
  peTrailing: 28,
  peForward: 24,
  priceToBook: 10,
  pegRatio: 0.9,
  enterpriseValue: 1_200_000_000_000,
  enterpriseToEbitda: 18,
  freeCashflow: 80_000_000_000,
  totalRevenue: 250_000_000_000,
  marketCap: 1_100_000_000_000,
  currency: "USD",
  dividendYield: 0.005,
  payoutRatio: 0.15,
  recommendationMean: 2,       // 1-5 where 1=strong buy
  numberOfAnalystOpinions: 45,
};

// A weak / distressed company
export const distressedCompany: Fundamentals = {
  symbol: "WEAK",
  sector: "Industrials",
  industry: "Airlines",
  longBusinessSummary: "A struggling hypothetical airline.",
  revenueGrowth: -0.05,
  earningsGrowth: -0.40,
  operatingMargin: -0.05,
  profitMargin: -0.08,
  roe: -0.12,
  roa: -0.05,
  debtToEquity: 450,           // very high leverage
  totalCash: 500_000_000,
  totalDebt: 15_000_000_000,
  currentRatio: 0.7,           // below 1 — liquidity strain
  quickRatio: 0.5,
  peTrailing: null,            // often null when losing money
  peForward: 25,
  priceToBook: 0.5,
  pegRatio: null,
  enterpriseValue: 18_000_000_000,
  enterpriseToEbitda: 35,
  freeCashflow: -2_000_000_000, // negative FCF
  totalRevenue: 20_000_000_000,
  marketCap: 3_500_000_000,
  currency: "USD",
  dividendYield: 0,
  payoutRatio: 0,
  recommendationMean: 4,
  numberOfAnalystOpinions: 12,
};

// A missing-data case (sparse fundamentals; many nulls)
export const sparseCompany: Fundamentals = {
  symbol: "SPARSE",
  sector: "Real Estate",
  industry: "REIT - Residential",
  longBusinessSummary: null,
  revenueGrowth: null,
  earningsGrowth: null,
  operatingMargin: null,
  profitMargin: null,
  roe: null,
  roa: null,
  debtToEquity: null,
  totalCash: null,
  totalDebt: null,
  currentRatio: null,
  quickRatio: null,
  peTrailing: 18,
  peForward: null,
  priceToBook: null,
  pegRatio: null,
  enterpriseValue: null,
  enterpriseToEbitda: null,
  freeCashflow: null,
  totalRevenue: null,
  marketCap: 5_000_000_000,
  currency: "USD",
  dividendYield: null,
  payoutRatio: null,
  recommendationMean: null,
  numberOfAnalystOpinions: null,
};
