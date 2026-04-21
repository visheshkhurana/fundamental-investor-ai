import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { rankIdea, reasonTags, type ScoredCandidate, type UserTilt } from "@/lib/ideas";

export const runtime = "nodejs";
export const maxDuration = 60;

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

const IDEAS_SYSTEM = `You are an investment research assistant.

You'll be given 5 ranked stock picks tailored to a user's portfolio. For each, write ONE paragraph (60-90 words) of thesis covering: what the business does in a line, why it's compelling right now based on the metrics provided, and the biggest single risk.

Rules:
- Only reference numbers supplied in the candidate object. Do not invent figures.
- Plain English. No hype language ("rocket ship", "can't-miss").
- Never recommend position sizes or predict prices.
- Mention the specific "reason_tag" drivers when relevant.
- Output as JSON only: { "theses": [{ "sym": "MARKET/SYMBOL", "text": "..." }] }`;

export async function GET(req: NextRequest) {
  // Read-only: returns the archive
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const sb = supabaseServer();
  const { data } = await sb
    .from("weekly_ideas")
    .select("week_start, picks, created_at, viewed_at")
    .eq("client_id", cid)
    .order("week_start", { ascending: false })
    .limit(12);
  return NextResponse.json({ archive: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "missing ANTHROPIC_API_KEY" }, { status: 500 });

  const sb = supabaseServer();

  // 1) Pull user's portfolio (for sector/style bias)
  const { data: acct } = await sb
    .from("trading_accounts")
    .select("id")
    .eq("client_id", cid)
    .maybeSingle();

  const { data: positions } = acct
    ? await sb
        .from("trading_positions")
        .select("market, symbol")
        .eq("account_id", acct.id)
    : { data: [] as any[] };

  const ownedTickers = new Set(
    (positions ?? []).map((p: any) => `${p.market}/${p.symbol}`),
  );

  // 2) Pull user's profile for risk tilt
  const { data: profile } = await sb
    .from("user_profile")
    .select("risk_tolerance")
    .eq("client_id", cid)
    .maybeSingle();
  const risk = profile?.risk_tolerance ?? 3;

  // 3) Build sector ownership map from score_cache of owned tickers
  let ownedSectors = new Set<string>();
  if (ownedTickers.size > 0) {
    const ownedList = [...ownedTickers].map((s) => {
      const [m, sy] = s.split("/");
      return { market: m, symbol: sy };
    });
    const orFilter = ownedList
      .map((x) => `and(market.eq.${x.market},symbol.eq.${x.symbol})`)
      .join(",");
    const { data: ownedSectorRows } = await sb
      .from("score_cache")
      .select("sector")
      .or(orFilter);
    for (const r of ownedSectorRows ?? []) {
      if (r.sector) ownedSectors.add(r.sector);
    }
  }

  // 4) Underweight sectors: everything in the universe not owned
  const { data: allSectors } = await sb
    .from("score_cache")
    .select("sector")
    .not("sector", "is", null);
  const universeSectors = new Set<string>(
    (allSectors ?? []).map((s: any) => s.sector).filter(Boolean),
  );
  const underweightSectors = new Set(
    [...universeSectors].filter((s) => !ownedSectors.has(s)),
  );

  // 5) Dismissed tickers
  const { data: dismissals } = await sb
    .from("idea_feedback")
    .select("market, symbol, action")
    .eq("client_id", cid)
    .eq("action", "dismiss");
  const dismissedTickers = new Set(
    (dismissals ?? []).map((d: any) => `${d.market}/${d.symbol}`),
  );

  // 6) Candidate universe from score_cache — only BUY / STRONG_BUY
  const { data: candidates } = await sb
    .from("score_cache")
    .select(
      "market, symbol, name, sector, industry, total_score, verdict, piotroski, moat_strength, moat_type, peg, pe, currency, updated_at",
    )
    .in("verdict", ["buy", "strong_buy"])
    .order("total_score", { ascending: false })
    .limit(100);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({
      picks: [],
      summary: "Not enough scored stocks yet. Populate score_cache by visiting more dashboards.",
    });
  }

  // 7) News signals lookup (last 14 days, positive only)
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const { data: news } = await sb
    .from("news_signals")
    .select("market, symbol, sentiment, headline, topic, published_at")
    .gte("published_at", since.toISOString())
    .gte("sentiment", 0.2);
  const positiveNews = new Map<string, any[]>();
  for (const n of news ?? []) {
    const key = `${n.market}/${n.symbol}`;
    if (!positiveNews.has(key)) positiveNews.set(key, []);
    positiveNews.get(key)!.push(n);
  }

  // 8) Preferred styles from the portfolio (simple heuristic)
  const preferredStyles = new Set<string>();
  if (risk <= 2) preferredStyles.add("quality");
  else if (risk === 3) {
    preferredStyles.add("quality");
    preferredStyles.add("value");
  } else {
    preferredStyles.add("value");
    preferredStyles.add("growth");
  }

  const tilt: UserTilt = {
    ownedSectors,
    underweightSectors,
    dismissedTickers,
    ownedTickers,
    preferredStyles,
    hasPositiveNews: (m, s) => positiveNews.has(`${m}/${s}`),
  };

  // 9) Rank
  const ranked = candidates
    .map((c: any) => {
      const candidate: ScoredCandidate = {
        market: c.market,
        symbol: c.symbol,
        name: c.name,
        sector: c.sector,
        industry: c.industry,
        total_score: Number(c.total_score),
        verdict: c.verdict,
        prev_score: null,
        moat_strength: c.moat_strength,
        piotroski: c.piotroski,
        peg: c.peg ? Number(c.peg) : null,
        pe: c.pe ? Number(c.pe) : null,
      };
      return {
        candidate,
        rank: rankIdea(candidate, tilt),
        tags: reasonTags(candidate, tilt),
        newsHeadline: positiveNews.get(`${c.market}/${c.symbol}`)?.[0]?.headline ?? null,
      };
    })
    .filter((r) => r.rank > -Infinity)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5);

  if (ranked.length === 0) {
    return NextResponse.json({
      picks: [],
      summary:
        "Nothing stood out after filtering owned / dismissed / weak verdict stocks. Try again next week.",
    });
  }

  // 10) Claude writes a thesis for each pick
  const compact = ranked.map((r) => ({
    sym: `${r.candidate.market}/${r.candidate.symbol}`,
    name: r.candidate.name,
    sector: r.candidate.sector,
    industry: r.candidate.industry,
    score: r.candidate.total_score,
    verdict: r.candidate.verdict,
    piotroski: r.candidate.piotroski,
    moat: r.candidate.moat_strength,
    peg: r.candidate.peg,
    pe: r.candidate.pe,
    tags: r.tags,
    news: r.newsHeadline,
  }));

  const anthropic = new Anthropic({ apiKey });

  let theses: { sym: string; text: string }[] = [];
  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: IDEAS_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Candidates (JSON):\n${JSON.stringify(compact)}\n\nReturn ONLY the JSON object described in the system prompt.`,
        },
      ],
    });
    const raw =
      resp.content.find((c) => c.type === "text")?.type === "text"
        ? (resp.content.find((c) => c.type === "text") as any).text
        : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    theses = parsed.theses ?? [];
  } catch (e: any) {
    // Non-fatal — fall back to tag-based mini theses
    theses = ranked.map((r) => ({
      sym: `${r.candidate.market}/${r.candidate.symbol}`,
      text: `${r.candidate.name ?? r.candidate.symbol} — ${r.candidate.verdict}, score ${r.candidate.total_score.toFixed(1)}. Drivers: ${r.tags.join(", ")}. (Thesis unavailable — Claude error.)`,
    }));
  }

  const thesisBySym = new Map(theses.map((t) => [t.sym, t.text]));
  const picks = ranked.map((r) => ({
    market: r.candidate.market,
    symbol: r.candidate.symbol,
    name: r.candidate.name,
    sector: r.candidate.sector,
    score: r.candidate.total_score,
    verdict: r.candidate.verdict,
    moat: r.candidate.moat_strength,
    peg: r.candidate.peg,
    pe: r.candidate.pe,
    tags: r.tags,
    newsHeadline: r.newsHeadline,
    thesis:
      thesisBySym.get(`${r.candidate.market}/${r.candidate.symbol}`) ??
      `${r.candidate.name ?? r.candidate.symbol} — score ${r.candidate.total_score.toFixed(1)}.`,
  }));

  // 11) Persist this week's ideas
  const weekStart = getMonday(new Date());
  await sb
    .from("weekly_ideas")
    .upsert(
      {
        client_id: cid,
        week_start: weekStart,
        picks: picks as unknown as object,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "client_id,week_start" },
    );

  return NextResponse.json({
    picks,
    summary: `${picks.length} ideas tuned to your portfolio (risk ${risk}/5, ${ownedSectors.size} sectors already held).`,
    meta: {
      universe_size: candidates.length,
      owned_sectors: [...ownedSectors],
      week_start: weekStart,
    },
  });
}

function getMonday(d: Date): string {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const m = new Date(d);
  m.setUTCDate(d.getUTCDate() - diff);
  m.setUTCHours(0, 0, 0, 0);
  return m.toISOString().slice(0, 10);
}
