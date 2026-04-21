// Fire-and-forget score cache. Every time a stock dashboard is rendered,
// we upsert its computed score so the screener can read it cheaply.

import { supabaseServer } from "@/lib/supabase";
import type { Fundamentals, Quote } from "@/lib/yahoo";
import type { ScoreResult } from "@/lib/scoring";

export async function cacheScore(
  market: string,
  symbol: string,
  fund: Fundamentals,
  quote: Quote | null,
  score: ScoreResult
) {
  try {
    const sb = supabaseServer();
    const { data: stock } = await sb
      .from("stocks")
      .select("id")
      .eq("market", market)
      .eq("symbol", symbol)
      .maybeSingle();
    if (!stock) {
      // Not in catalogue (maybe an on-the-fly search) — skip
      return;
    }
    await sb.from("score_cache").upsert(
      {
        stock_id: stock.id,
        market,
        symbol,
        name: quote?.name ?? fund.symbol,
        industry: fund.industry,
        sector: fund.sector,
        currency: fund.currency,
        price: quote?.price ?? null,
        market_cap: fund.marketCap,
        total_score: score.total,
        verdict: score.verdict,
        cat_macro: score.byCategory.macro,
        cat_industry: score.byCategory.industry,
        cat_company: score.byCategory.company,
        cat_valuation: score.byCategory.valuation,
        cat_triggers: score.byCategory.triggers,
        piotroski: score.advanced.piotroski.score,
        altman_z: score.advanced.altmanZ.score,
        altman_zone: score.advanced.altmanZ.zone,
        moat_type: score.advanced.moat.type,
        moat_strength: score.advanced.moat.strength,
        pe: fund.peTrailing,
        peg: score.advanced.lynchPEG.peg,
        de: fund.debtToEquity,
        fcf: fund.freeCashflow,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stock_id" }
    );
  } catch {
    // Never let cache writes break the main request
  }
}
