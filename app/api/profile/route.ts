import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientId(req: NextRequest) {
  return (req.headers.get("x-client-id") || "").trim();
}

// Shape returned to client
function defaults(cid: string) {
  return {
    client_id: cid,
    display_name: null,
    age: null,
    dependents: 0,
    risk_tolerance: null,
    tax_residence: null,
    primary_currency: "INR",
    monthly_income_inr: null,
    monthly_income_usd: null,
    monthly_expenses_inr: null,
    monthly_expenses_usd: null,
    retire_target_age: null,
    net_worth_goal_inr: null,
    notes: null,
  };
}

export async function GET(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("user_profile")
    .select("*")
    .eq("client_id", cid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data ?? defaults(cid) });
}

export async function PUT(req: NextRequest) {
  const cid = clientId(req);
  if (!cid) return NextResponse.json({ error: "missing client id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const sb = supabaseServer();

  const allowed = [
    "display_name",
    "age",
    "dependents",
    "risk_tolerance",
    "tax_residence",
    "primary_currency",
    "monthly_income_inr",
    "monthly_income_usd",
    "monthly_expenses_inr",
    "monthly_expenses_usd",
    "retire_target_age",
    "net_worth_goal_inr",
    "notes",
  ];
  const payload: Record<string, any> = { client_id: cid, updated_at: new Date().toISOString() };
  for (const k of allowed) {
    if (k in body) payload[k] = body[k];
  }

  const { data, error } = await sb
    .from("user_profile")
    .upsert(payload, { onConflict: "client_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
