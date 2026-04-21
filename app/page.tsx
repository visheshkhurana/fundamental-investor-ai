import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import WatchlistStrip from "@/components/WatchlistStrip";
import WaitlistForm from "@/components/WaitlistForm";
import Hero from "@/components/hero/Hero";
import { supabaseServer } from "@/lib/supabase";

export const revalidate = 300;

async function getFeatured() {
  const sb = supabaseServer();
  const { data } = await sb
    .from("stocks")
    .select("market, symbol, name, industry, featured")
    .eq("is_active", true)
    .eq("featured", true)
    .order("symbol")
    .limit(24);
  return data ?? [];
}

export default async function Home() {
  const featured = await getFeatured();
  const india = featured.filter((s: any) => s.market === "NSE" || s.market === "BSE");
  const us = featured.filter((s: any) => s.market === "NYSE" || s.market === "NASDAQ");

  return (
    <>
      {/* CINEMATIC HERO — full-bleed, dark, with live RELIANCE dashboard preview */}
      <Hero />

      <div className="space-y-16 pt-20 md:pt-24">
        {/* Search band */}
        <section>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight">
              Search any stock
            </h2>
            <p className="text-foreground/60 mt-2">
              Live quote, full scoring breakdown, AI explanation — in about two seconds.
            </p>
            <div className="mt-6 max-w-xl mx-auto">
              <SearchBox />
            </div>
            <div className="mt-3 text-xs text-foreground/50">
              Try:{" "}
              {[
                { m: "NSE", s: "RELIANCE" },
                { m: "NSE", s: "HDFCBANK" },
                { m: "NSE", s: "TCS" },
                { m: "NASDAQ", s: "AAPL" },
                { m: "NASDAQ", s: "NVDA" },
                { m: "NASDAQ", s: "GOOGL" },
              ].map((x, i) => (
                <span key={x.s}>
                  <Link href={`/s/${x.m}/${x.s}`} className="underline underline-offset-2 hover:text-foreground">
                    {x.s}
                  </Link>
                  {i < 5 ? " · " : ""}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
              <Link href="/compare?a=NASDAQ/AAPL&b=NASDAQ/MSFT" className="border border-white/10 bg-white/5 rounded-full px-3 py-1 hover:bg-white/10 transition">
                AAPL vs MSFT →
              </Link>
              <Link href="/compare?a=NSE/HDFCBANK&b=NSE/ICICIBANK" className="border border-white/10 bg-white/5 rounded-full px-3 py-1 hover:bg-white/10 transition">
                HDFC vs ICICI →
              </Link>
              <Link href="/compare?a=NSE/TCS&b=NSE/INFY" className="border border-white/10 bg-white/5 rounded-full px-3 py-1 hover:bg-white/10 transition">
                TCS vs INFY →
              </Link>
            </div>
          </div>
        </section>

        <WatchlistStrip />

        {/* Featured India */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-foreground/40">Featured — India</h2>
            <Link href="/compare?a=NSE/RELIANCE&b=NSE/TCS" className="text-xs text-foreground/50 hover:text-foreground underline">
              compare any two →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {india.map((s: any) => (
              <Link
                key={`${s.market}-${s.symbol}`}
                href={`/s/${s.market}/${s.symbol}`}
                className="card card-hover p-4"
              >
                <div className="font-semibold">{s.symbol}</div>
                <div className="text-xs text-foreground/60 mt-0.5 truncate">{s.name}</div>
                {s.industry && (
                  <div className="text-[11px] text-foreground/40 mt-1 truncate">{s.industry}</div>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Featured US */}
        <section>
          <h2 className="text-sm uppercase tracking-wider text-foreground/40 mb-4">
            Featured — United States
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {us.map((s: any) => (
              <Link
                key={`${s.market}-${s.symbol}`}
                href={`/s/${s.market}/${s.symbol}`}
                className="card card-hover p-4"
              >
                <div className="font-semibold">{s.symbol}</div>
                <div className="text-xs text-foreground/60 mt-0.5 truncate">{s.name}</div>
                {s.industry && (
                  <div className="text-[11px] text-foreground/40 mt-1 truncate">{s.industry}</div>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Waitlist */}
        <section className="relative card p-8 overflow-hidden">
          <div className="absolute inset-0 gradient-soft pointer-events-none" aria-hidden />
          <div className="relative grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="font-medium text-2xl tracking-tight">Get a weekly digest</h2>
              <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                Score changes on featured stocks, new Buffett / Lynch / Dorsey matches from the
                screener, and 1-2 curator picks — mailed to you every Sunday.
              </p>
              <p className="text-xs text-foreground/50 mt-2">
                Early signup. Free. Never shared.
              </p>
            </div>
            <WaitlistForm source="homepage_hero" />
          </div>
        </section>

        {/* Frameworks grid */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm uppercase tracking-wider text-foreground/40">
              The frameworks
            </h2>
            <Link href="/learn" className="text-xs text-foreground/50 hover:text-foreground underline">
              Read the explainers →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Link href="/learn/piotroski-f-score" className="card card-hover p-5 block">
              <div className="font-medium">Piotroski F-Score →</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                9-point financial-strength signal (2000). What a '7' actually means.
              </div>
            </Link>
            <Link href="/learn/altman-z-score" className="card card-hover p-5 block">
              <div className="font-medium">Altman Z-Score →</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                1968 bankruptcy predictor. The three zones — safe, grey, distress.
              </div>
            </Link>
            <Link href="/learn/moats" className="card card-hover p-5 block">
              <div className="font-medium">Dorsey's 5 moats →</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                Network, switching, intangibles, scale, regulatory — and how to tell fake from real.
              </div>
            </Link>
            <Link href="/learn/dcf" className="card card-hover p-5 block">
              <div className="font-medium">Two-stage DCF →</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                The math, the three assumptions that matter, and where the model breaks.
              </div>
            </Link>
            <Link href="/learn/peg" className="card card-hover p-5 block">
              <div className="font-medium">Lynch's PEG →</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                Why a P/E of 30 can be cheaper than a P/E of 10.
              </div>
            </Link>
            <div className="card p-5">
              <div className="font-medium">Claude AI</div>
              <div className="text-foreground/60 text-sm mt-1.5 leading-relaxed">
                Every answer grounded in the live scored metrics — no hallucinated numbers.
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
