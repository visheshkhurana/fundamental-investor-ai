import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { toYahooSymbol } from "@/lib/yahoo";

export const runtime = "nodejs";
export const revalidate = 300;

const yf: any = new (YahooFinance as any)();
try {
  yf.suppressNotices?.(["yahooSurvey", "ripHistorical"]);
} catch {}

function periodFromRange(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case "1mo":
      d.setMonth(d.getMonth() - 1);
      break;
    case "6mo":
      d.setMonth(d.getMonth() - 6);
      break;
    case "1y":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "5y":
      d.setFullYear(d.getFullYear() - 5);
      break;
    case "max":
      d.setFullYear(d.getFullYear() - 20);
      break;
    default:
      d.setFullYear(d.getFullYear() - 1);
  }
  return d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { market: string; symbol: string } }
) {
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  const interval: "1d" | "1wk" =
    range === "5y" || range === "max" ? "1wk" : "1d";
  const ysym = toYahooSymbol(params.market.toUpperCase(), params.symbol.toUpperCase());
  try {
    const period1 = periodFromRange(range);
    const data = await yf.chart(ysym, {
      period1,
      interval,
      includePrePost: false,
    });
    const quotes: any[] = data?.quotes ?? [];
    const candles = quotes
      .filter((q: any) => q.close != null)
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open ?? null,
        high: q.high ?? null,
        low: q.low ?? null,
        close: q.close ?? null,
      }));
    return NextResponse.json({
      symbol: ysym,
      range,
      interval,
      currency: data?.meta?.currency ?? null,
      candles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "chart error" }, { status: 500 });
  }
}
