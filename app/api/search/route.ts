import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });
  const sb = supabaseServer();

  // 1) Exact/prefix symbol match
  const { data: bySymbol } = await sb
    .from("stocks")
    .select("market, symbol, name, industry")
    .ilike("symbol", `${q}%`)
    .eq("is_active", true)
    .limit(8);

  // 2) Name trigram match
  const { data: byName } = await sb
    .from("stocks")
    .select("market, symbol, name, industry")
    .ilike("name", `%${q}%`)
    .eq("is_active", true)
    .limit(8);

  const seen = new Set<string>();
  const merged: any[] = [];
  for (const row of [...(bySymbol ?? []), ...(byName ?? [])]) {
    const key = `${row.market}-${row.symbol}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    if (merged.length >= 10) break;
  }
  return NextResponse.json({ results: merged });
}
