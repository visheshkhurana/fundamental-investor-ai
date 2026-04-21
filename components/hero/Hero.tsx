import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Particles from "./Particles";
import BlurIn from "./BlurIn";
import SplitText from "./SplitText";
import HeroDashboardPreview from "./HeroDashboardPreview";
import { fetchQuote, fetchFundamentals } from "@/lib/yahoo";
import { scoreStock } from "@/lib/scoring";

export const revalidate = 300;

async function loadShowcase() {
  try {
    const [q, f] = await Promise.all([
      fetchQuote("NSE", "RELIANCE"),
      fetchFundamentals("NSE", "RELIANCE"),
    ]);
    if (!f) return null;
    return { q, f, score: scoreStock(f, q?.price ?? null) };
  } catch {
    return null;
  }
}

export default async function Hero() {
  const showcase = await loadShowcase();

  return (
    <section
      className="w-full px-4 md:px-6 lg:px-8 overflow-hidden"
      style={{ marginLeft: "calc(-50vw + 50%)", width: "100vw" }}
    >
      <div className="gradient-card rounded-b-[35px] relative overflow-hidden px-4 pt-20 md:pt-28 pb-12 md:pb-16 flex flex-col items-center">
        <Particles variant="extended" />

        {/* Announcement badge — pill-with-chip pattern */}
        <BlurIn
          delay={0.1}
          className="relative z-10 inline-flex items-center gap-2 md:gap-3 pl-0.5 pr-3 md:pr-5 py-0.5 bg-white/5 rounded-[10px] border border-white/10 mb-8 hover:bg-white/10 transition-colors"
        >
          <span className="inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1 md:py-1.5 bg-[#010205] rounded-lg">
            <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3 text-white/80" />
            <span className="text-white/80 text-[10px] md:text-xs font-medium leading-5">
              AI Curator
            </span>
          </span>
          <span className="text-white/70 text-[10px] md:text-xs font-medium leading-5">
            Ask Claude for undervalued picks —{" "}
            <Link href="/curator" className="text-primary underline">
              try it
            </Link>
          </span>
        </BlurIn>

        {/* Headline */}
        <h1 className="relative z-10 text-4xl md:text-5xl lg:text-6xl font-medium leading-tight lg:leading-[1.15] text-foreground text-center max-w-[1000px] tracking-tight">
          <span className="block">
            <SplitText text="Invest like a" delayStart={0.2} />
          </span>
          <span className="block">
            <SplitText text="researcher," delayStart={0.4} />
          </span>
          <span className="block font-serif italic font-normal">
            <SplitText text="not a trader." delayStart={0.6} wordClassName="italic" />
          </span>
        </h1>

        {/* Subtitle */}
        <BlurIn
          delay={0.85}
          className="relative z-10 mt-6 max-w-[560px] text-center text-foreground/70 text-base md:text-lg font-normal leading-7 tracking-tight"
        >
          Every stock graded against the frameworks Buffett, Lynch, and Dorsey
          actually use — Piotroski F-Score, Altman Z, DCF, moats. Claude
          explains every score in plain English, grounded in the real metrics.
        </BlurIn>

        {/* CTAs */}
        <BlurIn delay={1.0} className="relative z-10 mt-8 flex items-center flex-wrap justify-center gap-3">
          <Link
            href="/curator"
            className="inline-flex items-center justify-center gap-2 bg-foreground text-background rounded-md px-6 h-11 text-sm font-medium hover:bg-foreground/90 transition"
          >
            Try the AI Curator
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/s/NSE/RELIANCE"
            className="inline-flex items-center justify-center gap-2 bg-white/10 text-foreground border border-white/10 rounded-md px-6 h-11 text-sm font-medium hover:bg-white/20 transition"
          >
            See a live stock
          </Link>
        </BlurIn>

        {/* Trust strip */}
        <BlurIn delay={1.15} className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · Yahoo Finance
          </span>
          <span>·</span>
          <span>India + US</span>
          <span>·</span>
          <span>Free · no login</span>
        </BlurIn>

        {/* Purple glow above dashboard */}
        <div className="relative z-[5] w-full max-w-[1200px] h-40 md:h-56 pointer-events-none">
          <div
            className="absolute left-0 right-0 top-0 h-[500px] opacity-50"
            style={{
              background:
                "radial-gradient(ellipse 70% 70% at 50% 50%, #7877C6 0%, rgba(0,0,0,0) 70%)",
            }}
          />
        </div>

        {/* Dashboard preview with 3D perspective */}
        {showcase && (
          <BlurIn
            delay={1.2}
            duration={0.8}
            className="relative z-10 w-full -mt-28 md:-mt-40 -mb-12 md:-mb-20"
          >
            <div className="[perspective:1200px] max-w-[1100px] mx-auto">
              <div className="[transform:rotateX(12deg)] scale-[0.95] origin-top">
                <div className="relative">
                  <HeroDashboardPreview
                    market="NSE"
                    symbol="RELIANCE"
                    name={showcase.q?.name ?? "Reliance Industries Limited"}
                    price={showcase.q?.price ?? null}
                    prevClose={showcase.q?.prevClose ?? null}
                    currency={showcase.q?.currency ?? "INR"}
                    mcap={showcase.f.marketCap}
                    score={showcase.score}
                  />
                </div>
              </div>
            </div>
          </BlurIn>
        )}
      </div>
    </section>
  );
}
