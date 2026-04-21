import { NextRequest, NextResponse } from "next/server";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";
import { cacheScore } from "@/lib/scoreCache";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  { params }: { params: { market: string; symbol: string } }
) {
  const market = params.market.toUpperCase();
  const symbol = params.symbol.toUpperCase();
  try {
    const [quote, fund] = await Promise.all([
      fetchQuote(market, symbol),
      fetchFundamentals(market, symbol),
    ]);
    if (!fund) {
      return NextResponse.json(
        { error: "Fundamentals unavailable — Yahoo may be rate-limiting. Try again shortly." },
        { status: 502 }
      );
    }
    const result = scoreStock(fund, quote?.price ?? null);
    // Fire-and-forget cache write for the screener. Do not await — we don't
    // want to slow the primary response path for a background concern.
    cacheScore(market, symbol, fund, quote, result).catch(() => {});
    return NextResponse.json({ quote, fundamentals: fund, score: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 });
  }
}
