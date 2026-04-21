// Generate and persist a short Claude review for a paper trade, grounded in
// the scored fundamentals of the traded stock. Designed to run after an order
// is placed — non-blocking, failures must not break the order flow.

import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";
import { cacheScore } from "@/lib/scoreCache";

const SYSTEM = `You are a concise investment research assistant. A user just paper-traded a stock. Given the trade + the stock's scored fundamentals, write one 2-3 sentence review in plain English.

Rules:
- Anchor every claim in the given metrics (e.g., "Piotroski 8/9", "PEG 0.53", "wide moat").
- First word of the review: one of ALIGNED / MIXED / MISALIGNED — capital, then a colon, then the review.
- ALIGNED when the trade direction supports the score (buying high-score, selling low-score).
- MISALIGNED when the trade contradicts the framework (buying a 3/10, selling a 9/10 without a clear reason).
- MIXED when it's nuanced (e.g., buying a good company at stretched valuation).
- Never recommend position sizes. Never predict prices. Never moralize. Research tooling, not advice.`;

type ReviewInput = {
  order_id: number;
  account_id: number;
  market: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
};

export async function reviewTrade(input: ReviewInput) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return;
    const sb = supabaseServer();

    // Look up cached score for context
    const { data: cached } = await sb
      .from("score_cache")
      .select(
        "total_score, verdict, cat_company, cat_valuation, piotroski, altman_z, altman_zone, moat_type, moat_strength, pe, peg, de, fcf, name, industry, sector, currency"
      )
      .eq("market", input.market)
      .eq("symbol", input.symbol)
      .maybeSingle();

    let sc: any = cached;

    // Cache miss — fetch live, score, cache, and use it.
    if (!sc) {
      const [quote, fund] = await Promise.all([
        fetchQuote(input.market, input.symbol),
        fetchFundamentals(input.market, input.symbol),
      ]);
      if (!fund) {
        await sb.from("trade_notes").insert({
          order_id: input.order_id,
          account_id: input.account_id,
          verdict: null,
          content: `(Yahoo didn't return fundamentals for ${input.symbol} — retry in a minute for a real review.)`,
          model: null,
        });
        return;
      }
      const score = scoreStock(fund, quote?.price ?? null);
      cacheScore(input.market, input.symbol, fund, quote, score).catch(() => {});
      sc = {
        total_score: score.total,
        verdict: score.verdict,
        cat_company: score.byCategory.company,
        cat_valuation: score.byCategory.valuation,
        piotroski: score.advanced.piotroski.score,
        altman_z: score.advanced.altmanZ.score,
        altman_zone: score.advanced.altmanZ.zone,
        moat_type: score.advanced.moat.type,
        moat_strength: score.advanced.moat.strength,
        pe: fund.peTrailing,
        peg: score.advanced.lynchPEG.peg,
        de: fund.debtToEquity,
        fcf: fund.freeCashflow,
        name: quote?.name ?? input.symbol,
        industry: fund.industry,
        sector: fund.sector,
        currency: fund.currency,
      };
    }

    const ctx = {
      symbol: `${input.market}/${input.symbol}`,
      name: sc.name,
      sector: sc.sector,
      industry: sc.industry,
      score: Number(sc.total_score),
      verdict: sc.verdict,
      piotroski: sc.piotroski,
      altman: sc.altman_zone,
      moat: `${sc.moat_strength} ${sc.moat_type}`,
      pe: sc.pe,
      peg: sc.peg,
      de: sc.de,
      company_score: sc.cat_company,
      valuation_score: sc.cat_valuation,
    };

    const anthropic = new Anthropic({ apiKey });
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 220,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Trade: ${input.side.toUpperCase()} ${input.qty} ${input.symbol} @ ${input.price} ${sc.currency ?? ""}
Context: ${JSON.stringify(ctx)}
Write the review.`,
        },
      ],
    });

    const text =
      resp.content.find((c) => c.type === "text")?.type === "text"
        ? (resp.content.find((c) => c.type === "text") as any).text.trim()
        : "";

    const verdict = text.startsWith("ALIGNED")
      ? "aligned"
      : text.startsWith("MISALIGNED")
        ? "misaligned"
        : text.startsWith("MIXED")
          ? "mixed"
          : null;

    await sb.from("trade_notes").insert({
      order_id: input.order_id,
      account_id: input.account_id,
      verdict,
      content: text,
      model: "claude-sonnet-4-6",
    });
  } catch {
    // Never surface review errors
  }
}
