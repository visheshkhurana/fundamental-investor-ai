import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STARTING_INR = 1_000_000;
const STARTING_USD = 10_000;

// Cross-currency conversion using a fixed FX rate. For MVP this is fine; the
// ranking is still directional. The "base" column lets users pick a ranking
// denomination without us needing FX plumbing.
const USD_PER_INR = 0.012;

export async function GET(_req: NextRequest) {
  const sb = supabaseServer();

  // Pull every account + its positions.
  const { data: accounts } = await sb
    .from("trading_accounts")
    .select("id, client_id, cash_inr, cash_usd, created_at");
  if (!accounts) return NextResponse.json({ rows: [] });

  const { data: positions } = await sb
    .from("trading_positions")
    .select("account_id, market, symbol, qty, avg_cost, currency");

  const { data: orderCounts } = await sb
    .from("trading_orders")
    .select("account_id, id");

  const byAcct = new Map<number, { positions: any[]; trades: number }>();
  for (const a of accounts) byAcct.set(a.id, { positions: [], trades: 0 });
  for (const p of positions ?? []) byAcct.get(p.account_id)?.positions.push(p);
  for (const o of orderCounts ?? []) {
    const b = byAcct.get(o.account_id);
    if (b) b.trades += 1;
  }

  // Get latest scored prices from score_cache for unrealized-pnl approximation.
  const { data: cache } = await sb
    .from("score_cache")
    .select("market, symbol, price");
  const priceMap = new Map<string, number>();
  for (const c of cache ?? []) if (c.price != null) priceMap.set(`${c.market}-${c.symbol}`, Number(c.price));

  const rows = accounts.map((a) => {
    const b = byAcct.get(a.id)!;
    let posValueInr = 0;
    let posValueUsd = 0;
    let posAtCostInr = 0;
    let posAtCostUsd = 0;
    for (const p of b.positions) {
      const ltp = priceMap.get(`${p.market}-${p.symbol}`) ?? Number(p.avg_cost);
      const value = Number(p.qty) * ltp;
      const cost = Number(p.qty) * Number(p.avg_cost);
      if (p.currency === "INR") {
        posValueInr += value;
        posAtCostInr += cost;
      } else {
        posValueUsd += value;
        posAtCostUsd += cost;
      }
    }
    const totalInr = Number(a.cash_inr) + posValueInr;
    const totalUsd = Number(a.cash_usd) + posValueUsd;

    // Convert both to USD for a single leaderboard currency
    const navUsd = totalUsd + totalInr * USD_PER_INR;
    const startingUsd = STARTING_USD + STARTING_INR * USD_PER_INR;
    const retPct = (navUsd - startingUsd) / startingUsd;

    return {
      client: a.client_id.slice(0, 12) + "…",
      joinedAt: a.created_at,
      trades: b.trades,
      positions: b.positions.length,
      cashInr: Number(a.cash_inr),
      cashUsd: Number(a.cash_usd),
      posValueInr,
      posValueUsd,
      navUsd,
      retPct,
    };
  });

  rows.sort((x, y) => y.retPct - x.retPct);
  return NextResponse.json({
    rows: rows.slice(0, 50),
    startingUsd: STARTING_USD + STARTING_INR * USD_PER_INR,
    fxRateUsdPerInr: USD_PER_INR,
  });
}
