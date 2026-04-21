import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Economic moats: the 5 types (Dorsey) — Fundamental Investor AI",
  description:
    "Pat Dorsey's framework for durable competitive advantage. Network effects, switching costs, intangibles, scale cost advantages, regulatory moats — with real-world examples.",
};

export default function Moats() {
  return (
    <article className="max-w-2xl mx-auto prose prose-slate">
      <Link href="/learn" className="no-underline text-xs text-foreground/60">
        ← Back to Learn
      </Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">Economic moats: the five types</h1>
      <p className="text-foreground/60 text-sm mt-0">
        Pat Dorsey's framework for durable competitive advantage.
      </p>

      <h2 className="mt-8">Why moats matter</h2>
      <p>
        In a competitive market, high returns attract entrants. Entrants erode
        margins. Margins regress to industry average. This is the default
        outcome for most businesses, most of the time.
      </p>
      <p>
        The companies that stay profitable for decades are the ones with a
        <i> structural reason</i> competitors can't touch them. Warren Buffett
        calls this an <b>economic moat</b>. Pat Dorsey, in <i>The Little Book
        That Builds Wealth</i> (2008), sharpened the concept into five specific
        sources. Every durable competitive advantage fits into one or more of
        them.
      </p>

      <h2 className="mt-8">1. Network effects</h2>
      <p>
        Each additional user makes the product more valuable for every existing
        user. A social network with 100 million users is not 10× better than
        one with 10 million — it's 100× better, because every user can now
        reach 10× as many other users.
      </p>
      <p>
        <b>Examples:</b> Visa and Mastercard (more merchants → more cardholders
        → more merchants), exchanges (NASDAQ, London Stock Exchange), marketplaces
        (Airbnb, Uber), social platforms (Meta), messaging (WhatsApp).
      </p>
      <p>
        <b>Signs it's real:</b> high incumbent operating margin, weak second
        place, new entrants fail despite massive capital.
      </p>
      <p>
        <b>Signs it's fake:</b> "users like our product" isn't a network effect
        unless each user makes the product better for others.
      </p>

      <h2 className="mt-8">2. Switching costs</h2>
      <p>
        Customers face real friction — financial, operational, psychological — to
        change providers, even when a competitor offers something technically
        better.
      </p>
      <p>
        <b>Examples:</b> enterprise software (Salesforce, SAP, Oracle),
        banking relationships (HDFC Bank, JPMorgan), medical devices (ISO-certified
        equipment), core banking platforms, ERP systems.
      </p>
      <p>
        <b>Signs it's real:</b> low churn, high net revenue retention (&gt;110%),
        integration depth, certification/training costs embedded in customer
        workflows.
      </p>
      <p>
        <b>Signs it's fake:</b> "our product is sticky" without concrete switching
        costs. If a customer can migrate in a weekend, there's no moat.
      </p>

      <h2 className="mt-8">3. Intangible assets</h2>
      <p>
        Brands, patents, trademarks, regulatory approvals, and other legally
        or culturally protected IP that prevents direct competition.
      </p>
      <p>
        <b>Examples:</b> Coca-Cola (brand), Hermès (luxury brand + craft
        scarcity), Pfizer (patents), Moody's and S&amp;P (regulatory endorsement
        via NRSRO designation).
      </p>
      <p>
        <b>Signs it's real:</b> pricing power sustained over decades despite
        substitutes, brand commands premium, patent portfolio with long runway.
      </p>
      <p>
        <b>Signs it's fake:</b> "strong brand" in a commodified category. Brand
        matters where purchase decisions are emotional or trust-dependent, not
        in steel or gasoline.
      </p>

      <h2 className="mt-8">4. Cost advantages from scale</h2>
      <p>
        Large players produce at per-unit costs smaller competitors
        can't match. This is only a moat when the <i>gap</i> is structural, not
        temporary.
      </p>
      <p>
        <b>Examples:</b> Walmart (logistics density), Amazon (fulfillment
        network), Costco (inventory turns), Reliance Jio (telecom infrastructure
        scale), ArcelorMittal (steel production scale).
      </p>
      <p>
        <b>Signs it's real:</b> materially lower operating costs per unit than
        competitors, sustained for years, not just during cyclical strength.
      </p>
      <p>
        <b>Signs it's fake:</b> "we're bigger so we're better." Size alone is not
        a moat — there has to be a mechanism (distribution density, unit
        economics, supplier leverage) that small players can't replicate.
      </p>

      <h2 className="mt-8">5. Regulatory (or efficient-scale) moats</h2>
      <p>
        Government licenses, franchise rights, or market structures where only
        one or two players can profitably operate.
      </p>
      <p>
        <b>Examples:</b> airports, regulated utilities (NTPC, Southern Company),
        pipelines, railroads (Union Pacific), defense contractors (Lockheed
        Martin, Hindustan Aeronautics), credit bureaus, legally-protected
        monopolies.
      </p>
      <p>
        <b>Signs it's real:</b> stable returns on capital with low volatility,
        political or legal barriers to new entry.
      </p>
      <p>
        <b>Risk profile:</b> regulatory moats are the <i>most</i> fragile to
        policy changes. When the government giveth, the government can taketh
        away.
      </p>

      <h2 className="mt-8">Wide moat vs narrow moat vs no moat</h2>
      <ul>
        <li>
          <b>Wide moat:</b> durable advantage expected to persist for 20+ years.
          Rare.
        </li>
        <li>
          <b>Narrow moat:</b> real advantage, but competitive dynamics or
          technology could erode it over 10–20 years.
        </li>
        <li>
          <b>No moat:</b> commodity-like returns; any excess returns will be
          competed away quickly.
        </li>
      </ul>

      <h2 className="mt-8">How Fundamental Investor AI uses it</h2>
      <p>
        Every stock gets an auto-classified moat type and strength (wide / narrow /
        none), inferred from sector, industry, and operating margin. This is a
        heuristic, not a formal Morningstar rating — you'll sometimes disagree,
        and that's fine. The classification is a starting point for your own
        analysis, not a verdict. Moat type and strength feed into the Industry
        score and contribute to the overall composite.
      </p>

      <div className="card p-5 not-prose mt-8 bg-white/5">
        <div className="font-semibold">Explore by moat</div>
        <p className="text-sm text-foreground/70 mt-1">
          The screener lets you filter to wide-moat-only or narrow+ stocks.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href="/screen?preset=dorsey" className="underline">Wide-moat universe</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NYSE/V" className="underline">Visa (network effect)</Link>
          <span className="text-foreground/30">·</span>
          <Link href="/s/NSE/HDFCBANK" className="underline">HDFC Bank (switching costs)</Link>
        </div>
      </div>

      <h2 className="mt-8">Further reading</h2>
      <ul>
        <li>Dorsey, P. (2008). <i>The Little Book That Builds Wealth.</i></li>
        <li>Mauboussin, M. (2016). <i>Measuring the Moat.</i> Credit Suisse.</li>
        <li>Buffett, W. (1999). Fortune essay on economic franchises.</li>
      </ul>
    </article>
  );
}
