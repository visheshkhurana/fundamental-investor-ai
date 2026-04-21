import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

export async function POST(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const { market, symbol, action, reason } = await req.json();
  if (!market || !symbol || !["dismiss", "watch", "buy"].includes(action)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from("idea_feedback").insert({
    client_id: cid,
    market,
    symbol,
    action,
    reason: reason ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
