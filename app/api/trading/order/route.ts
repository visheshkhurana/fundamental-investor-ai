import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { fetchQuote } from "@/lib/yahoo";
import { reviewTrade } from "@/lib/tradeReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  market: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
};

export async function POST(req: NextRequest) {
  const cid = (req.headers.get("x-client-id") || "").trim();
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { market, symbol, side, qty } = body;
  if (!market || !symbol || !side || !qty || qty <= 0) {
    return NextResponse.json({ error: "missing/invalid fields" }, { status: 400 });
  }

  // Execute at live market price
  const quote = await fetchQuote(market.toUpperCase(), symbol.toUpperCase());
  if (!quote || !quote.price) {
    return NextResponse.json(
      { error: "No live price for this symbol right now" },
      { status: 400 }
    );
  }
  const currency = quote.currency ?? (market.toUpperCase() === "NSE" || market.toUpperCase() === "BSE" ? "INR" : "USD");
  const sb = supabaseServer();

  const { data, error } = await sb.rpc("place_order", {
    p_client_id: cid,
    p_market: market.toUpperCase(),
    p_symbol: symbol.toUpperCase(),
    p_name: quote.name ?? symbol,
    p_side: side,
    p_qty: qty,
    p_price: quote.price,
    p_currency: currency,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "order failed" },
      { status: 400 }
    );
  }

  // Await the Claude review inline. Serverless functions terminate the moment
  // the response returns, so fire-and-forget would leave the write half-done.
  // The modal UI already shows "Placing…" so an extra 3-6s is acceptable UX.
  // reviewTrade swallows all internal errors; this await never throws.
  const execution = data as any;
  await reviewTrade({
    order_id: execution.order_id,
    account_id: execution.account_id,
    market: market.toUpperCase(),
    symbol: symbol.toUpperCase(),
    side,
    qty,
    price: Number(quote.price),
  });

  return NextResponse.json({ ok: true, execution });
}
