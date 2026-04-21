import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type Pick = {
  market: string;
  symbol: string;
  reason: string;
  highlights: string[];
};

const CURATOR_SYSTEM = `You are an investment research assistant for Fundamental Investor AI.

A user will ask for stocks matching some natural-language description. You will be given a catalogue of scored stocks (each with quantitative metrics). Your job: pick up to 5 that best match, and explain why in plain English.

Rules:
- Only pick from the provided catalogue — never invent tickers.
- Ground every reason in specific numbers from the catalogue row (e.g., "PEG 0.53, wide moat, Piotroski 8/9").
- Prefer clear winners; if fewer than 5 genuinely fit, return fewer — never pad.
- If nothing in the catalogue matches (e.g., user asks for "semiconductors" but none are scored), return zero picks and explain what's missing.
- Never recommend position sizes. Never predict prices. This is research tooling, not investment advice.
- Output as JSON only, matching the required schema.`;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || typeof query !== "string" || query.length > 300) {
    return NextResponse.json(
      { error: "query required (≤300 chars)" },
      { status: 400 }
    );
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "missing ANTHROPIC_API_KEY" }, { status: 500 });

  const sb = supabaseServer();
  // Pull the top-100 most recently scored stocks. Sort by score_cache updated_at
  // so the catalogue favors fresh data.
  const { data: cache } = await sb
    .from("score_cache")
    .select(
      "market, symbol, name, industry, sector, total_score, verdict, cat_company, cat_valuation, piotroski, altman_zone, moat_type, moat_strength, pe, peg, de, currency"
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!cache || cache.length === 0) {
    return NextResponse.json({
      picks: [],
      summary:
        "The score cache is empty. Visit a few stock dashboards to populate it, then come back.",
    });
  }

  const compact = cache.map((r: any) => ({
    sym: `${r.market}/${r.symbol}`,
    name: r.name,
    sector: r.sector,
    industry: r.industry,
    score: Number(r.total_score),
    verdict: r.verdict,
    company: Number(r.cat_company),
    valuation: Number(r.cat_valuation),
    piotroski: r.piotroski,
    altman: r.altman_zone,
    moat: `${r.moat_strength} ${r.moat_type}`,
    pe: r.pe != null ? Number(r.pe) : null,
    peg: r.peg != null ? Number(r.peg) : null,
    de: r.de != null ? Number(r.de) : null,
  }));

  const anthropic = new Anthropic({ apiKey });
  const userMessage = `User query: ${query}

Catalogue (${compact.length} stocks, JSON):
${JSON.stringify(compact)}

Return your answer as JSON only, matching this schema exactly:
{
  "summary": "one-sentence preamble — what you searched for and how many matches",
  "picks": [
    {
      "sym": "MARKET/SYMBOL",      // must appear in catalogue
      "reason": "2-3 sentences on why this fits, citing specific numbers",
      "highlights": ["key metric 1", "key metric 2", "key metric 3"]
    }
  ]
}
No markdown, no prose outside JSON.`;

  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: CURATOR_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });
    const raw =
      resp.content.find((c) => c.type === "text")?.type === "text"
        ? (resp.content.find((c) => c.type === "text") as any).text
        : "";
    // Strip any accidental code fences
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    let parsed: { summary: string; picks: any[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse AI response", raw: cleaned.slice(0, 500) },
        { status: 500 }
      );
    }

    // Enrich picks with full cache data for the UI
    const cacheMap = new Map<string, any>();
    for (const r of cache) cacheMap.set(`${r.market}/${r.symbol}`, r);

    const enriched = (parsed.picks ?? [])
      .map((p: any) => {
        const row = cacheMap.get(p.sym);
        if (!row) return null;
        return {
          market: row.market,
          symbol: row.symbol,
          name: row.name,
          industry: row.industry,
          sector: row.sector,
          score: Number(row.total_score),
          verdict: row.verdict,
          piotroski: row.piotroski,
          moat_strength: row.moat_strength,
          moat_type: row.moat_type,
          pe: row.pe,
          peg: row.peg,
          currency: row.currency,
          reason: p.reason,
          highlights: p.highlights ?? [],
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      summary: parsed.summary,
      picks: enriched,
      meta: { catalogueSize: compact.length, model: "claude-sonnet-4-6" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "curate failed" }, { status: 500 });
  }
}
