import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchQuote } from "@/lib/yahoo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

export async function GET(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const sb = supabaseServer();

  // Ensure account exists (insert if missing; do NOT touch cash on existing rows)
  await sb
    .from("trading_accounts")
    .upsert({ client_id: cid }, { onConflict: "client_id", ignoreDuplicates: true });

  const { data: acct } = await sb
    .from("trading_accounts")
    .select("id, cash_inr, cash_usd, created_at")
    .eq("client_id", cid)
    .single();

  const { data: positions } = await sb
    .from("trading_positions")
    .select("market, symbol, name, qty, avg_cost, currency, updated_at")
    .eq("account_id", acct!.id);

  // Pull live prices per position (sequential to avoid hammering Yahoo)
  const enriched = await Promise.all(
    (positions ?? []).map(async (p) => {
      const q = await fetchQuote(p.market, p.symbol);
      const ltp = q?.price ?? null;
      const value = ltp != null ? Number(ltp) * Number(p.qty) : null;
      const pnl = ltp != null ? (Number(ltp) - Number(p.avg_cost)) * Number(p.qty) : null;
      const pnlPct =
        ltp != null ? (Number(ltp) - Number(p.avg_cost)) / Number(p.avg_cost) : null;
      return { ...p, ltp, value, pnl, pnlPct };
    })
  );

  // Recent orders
  const { data: orders } = await sb
    .from("trading_orders")
    .select("id, market, symbol, side, qty, price, currency, total, executed_at")
    .eq("account_id", acct!.id)
    .order("executed_at", { ascending: false })
    .limit(20);

  // Claude reviews for those orders
  const orderIds = (orders ?? []).map((o: any) => o.id);
  const { data: notes } = orderIds.length
    ? await sb
        .from("trade_notes")
        .select("order_id, verdict, content")
        .in("order_id", orderIds)
    : { data: [] as any[] };
  const notesByOrder = new Map<number, { verdict: string | null; content: string }>();
  for (const n of notes ?? []) notesByOrder.set(n.order_id, { verdict: n.verdict, content: n.content });
  const ordersWithNotes = (orders ?? []).map((o: any) => ({
    ...o,
    review: notesByOrder.get(o.id) ?? null,
  }));

  const positionsValueInr = enriched
    .filter((p) => p.currency === "INR")
    .reduce((s, p) => s + (p.value ?? Number(p.avg_cost) * Number(p.qty)), 0);
  const positionsValueUsd = enriched
    .filter((p) => p.currency === "USD")
    .reduce((s, p) => s + (p.value ?? Number(p.avg_cost) * Number(p.qty)), 0);

  return NextResponse.json({
    account: acct,
    positions: enriched,
    orders: ordersWithNotes,
    summary: {
      cashInr: Number(acct!.cash_inr),
      cashUsd: Number(acct!.cash_usd),
      positionsValueInr,
      positionsValueUsd,
      totalInr: Number(acct!.cash_inr) + positionsValueInr,
      totalUsd: Number(acct!.cash_usd) + positionsValueUsd,
    },
  });
}
