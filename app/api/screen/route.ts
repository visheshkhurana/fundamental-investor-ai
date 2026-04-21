import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Preset = "buffett" | "lynch" | "dorsey" | "value_trap_reverse" | "none";

function applyPreset(q: any, preset: Preset) {
  if (preset === "buffett") {
    // Moat + high-quality profitability + low debt + FCF positive
    return q
      .in("moat_strength", ["wide", "narrow"])
      .gte("total_score", 6)
      .lt("de", 100) // < 1.0x
      .gt("fcf", 0);
  }
  if (preset === "lynch") {
    // Growth at reasonable price — PEG below 1, reasonable P/E
    return q.gt("peg", 0).lt("peg", 1).lt("pe", 30);
  }
  if (preset === "dorsey") {
    // Wide-moat-only universe
    return q.eq("moat_strength", "wide");
  }
  if (preset === "value_trap_reverse") {
    // Cheap AND strong, to avoid value traps
    return q
      .lt("pe", 20)
      .gt("piotroski", 6)
      .gte("total_score", 6);
  }
  return q;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sb = supabaseServer();

  const market = sp.get("market"); // 'IN' | 'US' | null
  const minScore = sp.get("minScore"); // '6'
  const maxPE = sp.get("maxPE"); // '30'
  const moat = sp.get("moat"); // 'wide' | 'narrow'
  const minPiotroski = sp.get("minPiotroski"); // '7'
  const preset = (sp.get("preset") as Preset | null) ?? "none";
  const sort = sp.get("sort") ?? "total_score.desc";
  const limit = Math.min(Number(sp.get("limit") ?? 30), 100);

  let q: any = sb
    .from("score_cache")
    .select(
      "stock_id, market, symbol, name, industry, sector, price, currency, market_cap, total_score, verdict, cat_company, cat_valuation, piotroski, altman_z, altman_zone, moat_type, moat_strength, pe, peg, de, fcf, updated_at"
    );

  if (market === "IN") q = q.in("market", ["NSE", "BSE"]);
  else if (market === "US") q = q.in("market", ["NYSE", "NASDAQ"]);

  if (minScore) q = q.gte("total_score", Number(minScore));
  if (maxPE) q = q.lt("pe", Number(maxPE));
  if (moat) q = q.eq("moat_strength", moat);
  if (minPiotroski) q = q.gte("piotroski", Number(minPiotroski));

  q = applyPreset(q, preset);

  const [col, dir] = sort.split(".");
  q = q.order(col as any, { ascending: dir === "asc" });
  q = q.limit(limit);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ results: data ?? [], preset, count: data?.length ?? 0 });
}
