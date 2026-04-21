import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  const source = body.source?.slice(0, 48) ?? "homepage";
  const referrer = req.headers.get("referer")?.slice(0, 200) ?? null;
  const sb = supabaseServer();
  const { error } = await sb
    .from("waitlist")
    .upsert(
      { email, source, referrer },
      { onConflict: "email", ignoreDuplicates: true }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
