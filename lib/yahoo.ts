// Yahoo Finance client via `yahoo-finance2` — handles crumb+cookie auth
// robustly, which matters when running in Vercel's serverless environment.

import YahooFinance from "yahoo-finance2";

// v3 requires instantiation. Reusing a single instance per cold-start.
const yahooFinance: any = new (YahooFinance as any)();
try {
  yahooFinance.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {}

// Map our (market, symbol) to the Yahoo ticker.
// NSE → .NS, BSE → .BO, NYSE/NASDAQ → plain symbol.
export function toYahooSymbol(market: string, symbol: string) {
  const m = market.toUpperCase();
  if (m === "NSE") return `${symbol}.NS`;
  if (m === "BSE") return `${symbol}.BO`;
  return symbol;
}

export type Quote = {
  symbol: string;
  price: number | null;
  prevClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  currency: string | null;
  exchange: string | null;
  name: string | null;
  asOf: string;
};

export async function fetchQuote(market: string, symbol: string): Promise<Quote | null> {
  const y = toYahooSymbol(market, symbol);
  try {
    const q: any = await yahooFinance.quote(y);
    if (!q) return null;
    return {
      symbol: q.symbol,
      price: q.regularMarketPrice ?? null,
      prevClose: q.regularMarketPreviousClose ?? null,
      dayHigh: q.regularMarketDayHigh ?? null,
      dayLow: q.regularMarketDayLow ?? null,
      yearHigh: q.fiftyTwoWeekHigh ?? null,
      yearLow: q.fiftyTwoWeekLow ?? null,
      currency: q.currency ?? null,
      exchange: q.fullExchangeName ?? q.exchange ?? null,
      name: q.longName ?? q.shortName ?? null,
      asOf: new Date(
        (q.regularMarketTime instanceof Date
          ? q.regularMarketTime.getTime()
          : Date.now())
      ).toISOString(),
    };
  } catch (e) {
    return null;
  }
}

export type Fundamentals = {
  symbol: string;
  sector: string | null;
  industry: string | null;
  longBusinessSummary: string | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  operatingMargin: number | null;
  profitMargin: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  peTrailing: number | null;
  peForward: number | null;
  priceToBook: number | null;
  priceToSales: number | null;
  peg: number | null;
  evToEbitda: number | null;
  beta: number | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  freeCashflow: number | null;
  operatingCashflow: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  targetMeanPrice: number | null;
  recommendationKey: string | null;
  numberOfAnalystOpinions: number | null;
  totalRevenue: number | null;
  revenuePerShare: number | null;
  currency: string | null;
  asOf: string;
};

const MODULES = [
  "financialData",
  "defaultKeyStatistics",
  "summaryDetail",
  "assetProfile",
  "price",
] as const;

export async function fetchFundamentals(
  market: string,
  symbol: string
): Promise<Fundamentals | null> {
  const y = toYahooSymbol(market, symbol);
  try {
    const r: any = await yahooFinance.quoteSummary(y, { modules: MODULES as any });
    if (!r) return null;
    const fd = r.financialData ?? {};
    const dks = r.defaultKeyStatistics ?? {};
    const sd = r.summaryDetail ?? {};
    const ap = r.assetProfile ?? {};
    const price = r.price ?? {};
    // yahoo-finance2 returns primitives, not {raw: ...}
    const n = (v: any): number | null =>
      v == null
        ? null
        : typeof v === "number"
          ? v
          : typeof v === "object" && "raw" in v
            ? Number(v.raw)
            : null;

    return {
      symbol: y,
      sector: ap.sector ?? null,
      industry: ap.industry ?? null,
      longBusinessSummary: ap.longBusinessSummary ?? null,
      revenueGrowth: n(fd.revenueGrowth),
      earningsGrowth: n(fd.earningsGrowth),
      operatingMargin: n(fd.operatingMargins),
      profitMargin: n(fd.profitMargins),
      roe: n(fd.returnOnEquity),
      roa: n(fd.returnOnAssets),
      debtToEquity: n(fd.debtToEquity),
      totalCash: n(fd.totalCash),
      totalDebt: n(fd.totalDebt),
      currentRatio: n(fd.currentRatio),
      quickRatio: n(fd.quickRatio),
      peTrailing: n(sd.trailingPE),
      peForward: n(sd.forwardPE) ?? n(dks.forwardPE),
      priceToBook: n(dks.priceToBook),
      priceToSales: n(sd.priceToSalesTrailing12Months),
      peg: n(dks.pegRatio) ?? n(dks.trailingPegRatio),
      evToEbitda: n(dks.enterpriseToEbitda),
      beta: n(sd.beta) ?? n(dks.beta),
      marketCap: n(sd.marketCap) ?? n(price.marketCap),
      enterpriseValue: n(dks.enterpriseValue),
      freeCashflow: n(fd.freeCashflow),
      operatingCashflow: n(fd.operatingCashflow),
      dividendYield: n(sd.dividendYield),
      payoutRatio: n(sd.payoutRatio),
      targetMeanPrice: n(fd.targetMeanPrice),
      recommendationKey: fd.recommendationKey ?? null,
      numberOfAnalystOpinions: n(fd.numberOfAnalystOpinions),
      totalRevenue: n(fd.totalRevenue),
      revenuePerShare: n(fd.revenuePerShare),
      currency: sd.currency ?? price.currency ?? null,
      asOf: new Date().toISOString(),
    };
  } catch (e) {
    return null;
  }
}
