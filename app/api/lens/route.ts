// Portfolio Lens API. Reads the user's paper trading positions + their
// cached scores, computes sector + style aggregates, returns value-weighted
// percentages and concentration flags.
//
// GET /api/lens
// Headers: x-client-id (required)
//
// Response:
// {
//   total_value_usd: number,
//   positions: N,
//   by_sector: [{ sector, value_usd, pct, n, top_symbol }],
//   by_style:  [{ style,  value_usd, pct, n, top_symbol }],
//   flags: string[]
// }

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { classifyStyle, type InvestmentStyle } from "@/lib/style";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USD_PER_INR = 0.012; // same rate as leaderboard — fixed for ranking

export async function GET(req: NextRequest) {
  const cid = (req.headers.get("x-client-id") || "").trim();
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });

  const sb = supabaseServer();
  const { data: acct } = await sb
    .from("trading_accounts")
    .select("id")
    .eq("client_id", cid)
    .maybeSingle();

  if (!acct) {
    return NextResponse.json({
      total_value_usd: 0,
      positions: 0,
      by_sector: [],
      by_style: [],
      flags: ["No trading account yet — place a paper trade first."],
    });
  }

  const { data: positions } = await sb
    .from("trading_positions")
    .select("market, symbol, qty, avg_cost, currency")
    .eq("account_id", acct.id);

  if (!positions || positions.length === 0) {
    return NextResponse.json({
      total_value_usd: 0,
      positions: 0,
      by_sector: [],
      by_style: [],
      flags: ["No positions yet."],
    });
  }

  // Pull cached metrics for every held symbol in one query
  const pairs = positions.map((p) => ({ market: p.market, symbol: p.symbol }));
  const { data: cache } = await sb
    .from("score_cache")
    .select(
      "market, symbol, sector, industry, price, pe, peg, de, piotroski, moat_type, moat_strength, fcf"
    )
    .or(
      pairs
        .map((p) => `and(market.eq.${p.market},symbol.eq.${p.symbol})`)
        .join(",")
    );

  const cacheMap = new Map<string, any>();
  for (const c of cache ?? []) cacheMap.set(`${c.market}/${c.symbol}`, c);

  // Pull full fundamentals just for positions missing cache fields we need.
  // For MVP we don't fetch live — if cache is stale, the position defaults to
  // balanced/unknown. (The /s/[market]/[symbol] visit will refresh.)

  type Bucket = { key: string; value: number; n: number; top_symbol: string; top_value: number };
  const sectorBuckets = new Map<string, Bucket>();
  const styleBuckets = new Map<InvestmentStyle, Bucket>();
  let totalUsd = 0;

  for (const p of positions) {
    const key = `${p.market}/${p.symbol}`;
    const c = cacheMap.get(key);
    const ltp = c?.price ? Number(c.price) : Number(p.avg_cost);
    const valueNative = Number(p.qty) * ltp;
    const valueUsd =
      p.currency === "INR" ? valueNative * USD_PER_INR : valueNative;
    totalUsd += valueUsd;

    const sector = c?.sector ?? "Unknown";
    const style: InvestmentStyle = c
      ? classifyStyle({
          pe: c.pe,
          peg: c.peg,
          piotroski: c.piotroski,
          debtToEquity: c.de,
          fcf: c.fcf,
          moatStrength: c.moat_strength,
        })
      : "balanced";

    for (const [m, bucket] of [
      [sectorBuckets, sector] as const,
    ]) {
      const prev = m.get(bucket) ?? {
        key: bucket,
        value: 0,
        n: 0,
        top_symbol: p.symbol,
        top_value: 0,
      };
      prev.value += valueUsd;
      prev.n += 1;
      if (valueUsd > prev.top_value) {
        prev.top_symbol = p.symbol;
        prev.top_value = valueUsd;
      }
      m.set(bucket, prev);
    }

    {
      const prev = styleBuckets.get(style) ?? {
        key: style,
        value: 0,
        n: 0,
        top_symbol: p.symbol,
        top_value: 0,
      };
      prev.value += valueUsd;
      prev.n += 1;
      if (valueUsd > prev.top_value) {
        prev.top_symbol = p.symbol;
        prev.top_value = valueUsd;
      }
      styleBuckets.set(style, prev);
    }
  }

  const toRows = <T extends { key: string; value: number; n: number; top_symbol: string }>(
    buckets: Map<any, T>,
    field: "sector" | "style"
  ) =>
    Array.from(buckets.values())
      .map((b) => ({
        [field]: b.key,
        value_usd: Number(b.value.toFixed(2)),
        pct: totalUsd > 0 ? Number(((b.value / totalUsd) * 100).toFixed(2)) : 0,
        n: b.n,
        top_symbol: b.top_symbol,
      }))
      .sort((a, b) => b.value_usd - a.value_usd);

  const bySector = toRows(sectorBuckets, "sector");
  const byStyle = toRows(styleBuckets, "style");

  // Concentration flags
  const flags: string[] = [];
  for (const r of bySector as any[]) {
    if (r.pct > 25) flags.push(`Sector concentration: ${r.sector} is ${r.pct}% of book`);
  }
  for (const r of byStyle as any[]) {
    if (r.pct > 70) flags.push(`Style concentration: ${r.pct}% in ${r.style}`);
  }
  if (bySector.length < 3) flags.push(`Thin diversification: only ${bySector.length} sector(s)`);

  return NextResponse.json({
    total_value_usd: Number(totalUsd.toFixed(2)),
    positions: positions.length,
    by_sector: bySector,
    by_style: byStyle,
    flags,
  });
}
