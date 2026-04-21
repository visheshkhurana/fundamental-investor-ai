import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { fetchQuote } from "@/lib/yahoo";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are a portfolio-level research assistant for Fundamental Investor AI.

A user will share their paper-trading portfolio with positions, scored fundamentals per position, and a summary. Your job: give a calm, concrete read on the whole thing as a *set*, not stock by stock.

Output format — VERY IMPORTANT:

1. Start your entire message with a fenced \`\`\`json block containing { "actions": [ ... ] } — the 0-3 most useful actions the user could take right now. Include actions on existing positions (sell / trim) or on score-cached stocks (buy / add). Only reference tickers that appear in the provided data. Keep this block compact — the user is waiting for it.

2. Then a blank line, then the prose review under these exact H3 markdown headings in this order:
### Overall read
One paragraph. What's the shape of this book? Quality-heavy, value-heavy, concentrated, defensive?

### Quality mix
Value-weighted average of the composite scores. Flag any position below 5 that's meaningfully weighted. Note Piotroski outliers (both 8-9 and <5).

### Concentration & diversification
Sector exposure, single-name concentration (>25% of NAV in one position is a flag), currency mix (INR vs USD).

### Misalignments
Where does the portfolio contradict the framework? (e.g., holding a score-3 stock as a top position, selling a score-9 while keeping a score-4.) If none, say so.

### Suggested moves
2-3 bullet points that each correspond 1:1 with the actions in your opening JSON block. Focus on *quality upgrades* or *risk trims*. Frame as "consider" not "do".

Each action object in the opening JSON looks like:
{
  "label": "Trim Apple",                   // short action verb + stock
  "market": "NASDAQ",                      // exact market from the catalogue
  "symbol": "AAPL",                        // exact symbol from the catalogue
  "side": "sell" | "buy",
  "qty_hint": "50%"                        // or an absolute number, or "half", or "all"
  "rationale": "PEG 2.43, Piotroski 5/9; weakest valuation in the book"  // 1 sentence
}

If no strong actions apply, open with \`\`\`json\\n{"actions":[]}\\n\`\`\` and proceed to prose.

Rules:
- Anchor every claim in specific numbers from the provided data (cite PEG, Piotroski, score).
- Never recommend specific position sizes in the prose. The qty_hint in the JSON is a rough guide, not a recommendation.
- Never predict prices.
- If the portfolio is empty, say so in the prose and return empty actions.
- End the prose with: "Research tooling, not investment advice."`;

export async function POST(req: NextRequest) {
  const cid = (req.headers.get("x-client-id") || "").trim();
  if (!cid)
    return new Response("missing client id", { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response("missing ANTHROPIC_API_KEY", { status: 500 });

  const sb = supabaseServer();
  const { data: acct } = await sb
    .from("trading_accounts")
    .select("id, cash_inr, cash_usd")
    .eq("client_id", cid)
    .maybeSingle();
  if (!acct) return new Response("no account", { status: 404 });

  const { data: positions } = await sb
    .from("trading_positions")
    .select("market, symbol, name, qty, avg_cost, currency")
    .eq("account_id", acct.id);

  if (!positions || positions.length === 0) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            "### Overall read\nYou have no positions yet. Open any stock dashboard and tap **Trade** to place your first order — then come back here for a portfolio-level review.\n\nResearch tooling, not investment advice."
          )
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Enrich each position with cached score + live LTP
  const enriched = await Promise.all(
    positions.map(async (p: any) => {
      const { data: sc } = await sb
        .from("score_cache")
        .select(
          "total_score, verdict, cat_company, cat_valuation, piotroski, altman_zone, moat_type, moat_strength, pe, peg, de, sector, industry"
        )
        .eq("market", p.market)
        .eq("symbol", p.symbol)
        .maybeSingle();
      const quote = await fetchQuote(p.market, p.symbol).catch(() => null);
      const ltp = quote?.price ?? Number(p.avg_cost);
      const value = Number(p.qty) * ltp;
      return {
        sym: `${p.market}/${p.symbol}`,
        name: p.name,
        qty: Number(p.qty),
        avg_cost: Number(p.avg_cost),
        ltp,
        value,
        currency: p.currency,
        pnl_pct: (ltp - Number(p.avg_cost)) / Number(p.avg_cost),
        score: sc?.total_score != null ? Number(sc.total_score) : null,
        verdict: sc?.verdict ?? null,
        company: sc?.cat_company ?? null,
        valuation: sc?.cat_valuation ?? null,
        piotroski: sc?.piotroski ?? null,
        altman: sc?.altman_zone ?? null,
        moat: sc
          ? `${sc.moat_strength} ${sc.moat_type}`
          : null,
        pe: sc?.pe ?? null,
        peg: sc?.peg ?? null,
        de: sc?.de ?? null,
        sector: sc?.sector ?? null,
        industry: sc?.industry ?? null,
      };
    })
  );

  // Summary stats
  const totalValueInr = enriched
    .filter((p) => p.currency === "INR")
    .reduce((s, p) => s + p.value, 0);
  const totalValueUsd = enriched
    .filter((p) => p.currency === "USD")
    .reduce((s, p) => s + p.value, 0);
  const totalNavUsd =
    Number(acct.cash_usd) +
    totalValueUsd +
    (Number(acct.cash_inr) + totalValueInr) * 0.012;

  // Weighted-average score (by position value, converted to USD)
  let weight = 0;
  let weightedScore = 0;
  for (const p of enriched) {
    if (p.score == null) continue;
    const w = p.currency === "INR" ? p.value * 0.012 : p.value;
    weight += w;
    weightedScore += w * p.score;
  }
  const avgScore = weight > 0 ? weightedScore / weight : null;

  const context = {
    summary: {
      positions: enriched.length,
      cash_inr: Number(acct.cash_inr),
      cash_usd: Number(acct.cash_usd),
      positions_value_inr: totalValueInr,
      positions_value_usd: totalValueUsd,
      total_nav_usd: totalNavUsd,
      starting_nav_usd: 10_000 + 1_000_000 * 0.012,
      weighted_avg_score: avgScore,
    },
    positions: enriched,
  };

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const resp = await anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1400,
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: `My paper-trading portfolio (JSON). Please write the full review under the specified headings.\n\n${JSON.stringify(context, null, 2)}`,
            },
          ],
        });
        for await (const ev of resp) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(ev.delta.text));
          }
        }
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(`\n\n[review error: ${e?.message ?? "unknown"}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
