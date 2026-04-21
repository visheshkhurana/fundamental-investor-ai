import type { Metadata } from "next";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";

export async function generateMetadata({
  params,
}: {
  params: { market: string; symbol: string };
}): Promise<Metadata> {
  const { market, symbol } = params;
  const m = market.toUpperCase();
  const s = symbol.toUpperCase();
  try {
    const [quote, fund] = await Promise.all([fetchQuote(m, s), fetchFundamentals(m, s)]);
    const score = fund ? scoreStock(fund, quote?.price ?? null) : null;
    const name = quote?.name ?? s;
    const verdict = score
      ? score.verdict.replace("_", " ").replace(/\b\w/g, (x) => x.toUpperCase())
      : "";
    const title = score
      ? `${s} · ${score.total.toFixed(1)}/10 ${verdict} — Fundamental Investor AI`
      : `${s} — Fundamental Investor AI`;
    const description = score
      ? `${name} scores ${score.total.toFixed(1)}/10 on the Buffett/Lynch/Dorsey framework: company ${score.byCategory.company.toFixed(1)}, valuation ${score.byCategory.valuation.toFixed(1)}, Piotroski ${score.advanced.piotroski.score}/9. Not investment advice.`
      : `Live fundamentals analysis for ${s}.`;
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return { title: `${s} — Fundamental Investor AI` };
  }
}

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return children;
}
