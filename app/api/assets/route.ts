import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { ASSET_CLASSES } from "@/lib/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

const EDITABLE = [
  "asset_class",
  "subtype",
  "label",
  "market_value_inr",
  "market_value_usd",
  "cost_basis",
  "acquired_on",
  "liquidity_days",
  "notes",
  "metadata",
];

export async function GET(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("asset_holdings")
    .select("*")
    .eq("client_id", cid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holdings: data ?? [] });
}

export async function POST(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!ASSET_CLASSES.includes(body.asset_class)) {
    return NextResponse.json({ error: "invalid asset_class" }, { status: 400 });
  }
  if (!body.label) {
    return NextResponse.json({ error: "label required" }, { status: 400 });
  }
  const sb = supabaseServer();
  const payload: Record<string, any> = { client_id: cid };
  for (const k of EDITABLE) if (k in body) payload[k] = body[k];

  const { data, error } = await sb
    .from("asset_holdings")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holding: data });
}

export async function PATCH(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sb = supabaseServer();
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of EDITABLE) if (k in body) patch[k] = body[k];
  const { data, error } = await sb
    .from("asset_holdings")
    .update(patch)
    .eq("id", body.id)
    .eq("client_id", cid)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holding: data });
}

export async function DELETE(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb
    .from("asset_holdings")
    .delete()
    .eq("id", id)
    .eq("client_id", cid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
