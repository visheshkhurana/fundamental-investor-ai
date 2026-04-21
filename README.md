# Fundamental Investor AI

A research-driven wealth-OS for long-term equity investors in India (NSE/BSE) and the US (NYSE/NASDAQ). Every stock scored against a structured framework (macro → industry → company → valuation → triggers) with Piotroski F-Score, Altman Z-Score, Dorsey moat classification, Lynch PEG, and two-stage DCF. Claude Sonnet 4.6 explains every score in plain English.

**Live:** https://fundamental-investor-ai.vercel.app

## What it does

- **Stock dashboard** — 18-item composite score (0–10) across five weighted categories, plus advanced overlays for Piotroski, Altman Z, Dorsey moat, DCF fair value, Lynch PEG.
- **AI Curator** — natural-language stock screener ("quality compounders under PEG 1.2").
- **Screen** — preset filters (Buffett, Lynch, wide-moat, value-trap-reverse).
- **Compare** — head-to-head stock comparison across 19 metrics with diff arrows.
- **Lens** — sector + style breakdown of your paper-trading book with concentration flags.
- **Trade** — paper trading with ₹10L + $50k sandbox, atomic order execution, per-order Claude review, portfolio-level AI review.
- **Estate** — India + US wealth-transfer checklist (nominees, Wills, digital assets) with Markdown heir-handoff export.
- **Onboarding** — 3-step wizard (profile → assets → review). No login; anonymous client identity via localStorage UUID.
- **Allocation** — target asset mix (9 classes) driven by age-glide, risk tolerance, tax residence. Donut comparison + delta bars + rebalance plan.
- **Ideas** — AI-ranked weekly picks tuned to your portfolio, with one-paragraph theses grounded in real metrics.
- **Assistant** — streaming Claude chat with per-stock retrieval-context injection.

## Stack

- **Frontend:** Next.js 14 (App Router, Server + Client Components), TypeScript, Tailwind CSS. Dark-mode only with HSL CSS variable design system.
- **Database:** Supabase (Postgres 17, ap-south-1). 19 tables covering stocks catalog, fundamentals cache, score cache, AI conversations, paper trading (atomic RPC), user profile, asset holdings, news signals, weekly ideas, waitlist, estate checklist.
- **Data:** Yahoo Finance via `yahoo-finance2@^3` (module-cached crumb auth, 4h fundamentals cache, 60s quote cache).
- **AI:** Anthropic Claude Sonnet 4.6, streaming with JSON-actions-first pattern for serverless-timeout resilience.
- **Hosting:** Vercel (hobby tier).
- **Charts:** TradingView lightweight-charts (MIT).

## Frameworks cited

- Warren Buffett / Charlie Munger — owner earnings, moat thinking, margin of safety
- Peter Lynch — PEG heuristic, growth-at-reasonable-price
- Pat Dorsey — 5 moat sources (network, switching costs, intangibles, scale, regulatory)
- Joseph Piotroski (2000) — 9-point F-Score on profitability/leverage/efficiency
- Edward Altman (1968) — Z-Score bankruptcy predictor
- Two-stage DCF with conservative defaults (10% WACC, 3% terminal growth)

## Local development

Requires Node.js 20+.

```bash
npm install
cp .env.production.example .env.local   # fill in your own keys
npm run dev
```

### Environment variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # the publishable/anon key, safe to embed
ANTHROPIC_API_KEY=sk-ant-api03-...                 # server-side only
```

The Supabase publishable key is public by design — the schema enforces RLS on sensitive tables. The Anthropic key is only read in `app/api/**` routes (server-side).

### Database

Schema lives in Supabase directly (no committed migrations yet). Key tables:

- `stocks` — ticker universe (165 seeded: 94 NSE, 27 NASDAQ, 44 NYSE)
- `fundamentals_cache` — Yahoo Finance snapshots, TTL 4h
- `score_cache` — lazy-computed scoring results
- `trading_accounts` / `trading_orders` / `trading_positions` — paper trading
- `trade_notes` — Claude's per-order review
- `user_profile` / `asset_holdings` — v7 Foundation data
- `allocation_recommendations` — v7 Tool 1 snapshots
- `news_signals` / `weekly_ideas` / `idea_feedback` — v7 Tool 8

## Project structure

```
app/
  api/               Server routes (trading, assistant, curate, ideas, allocation, profile, assets)
  s/[market]/[sym]/  Stock dashboards + dynamic OG images
  compare/           Head-to-head pages
  trade/             Paper trading surfaces
  onboarding/        3-step wealth profile wizard
  allocation/        Tool 1 — wealth allocation
  ideas/             Tool 8 — AI idea generation
  lens/              Portfolio sector/style lens
  estate/            Estate planning checklist
  learn/             Educational docs
components/          Reusable UI primitives (ScoreBadge, CategoryCard, etc.)
lib/                 Pure-function engines (scoring, signals, allocation, ideas, assets, fmt)
```

## Patterns worth studying

1. **Pure-function scoring** — `lib/scoring.ts` takes a plain object, returns a plain object. No DB, no network. Runs identically in API routes, client components, and edge-runtime OG images.

2. **Streaming AI with JSON-actions-first** — Claude responses put a JSON actions block at the top so clickable buttons render even when Vercel truncates the stream at 60s.

3. **Anonymous client identity** — localStorage UUID in `x-client-id` header gives full personalization without auth. See `lib/clientId.ts`.

4. **Next.js 14 fetch-cache workaround** — `lib/supabase.ts` forces `cache: "no-store"` on Supabase reads to avoid silent stale-read bugs.

5. **Atomic Postgres RPCs** — `place_order` wraps cash-check + insert in one transaction to prevent race conditions.

6. **Polymorphic holdings** — one `asset_holdings` table covers 9 asset classes with a `jsonb` metadata column for flexibility.

7. **Grounded AI theses** — Claude prompts include only the metrics we trust; the system prompt says "never invent figures", which drops hallucinations to near-zero.

## Disclaimer

Research tooling only. Not investment advice. Not a SEBI-registered or SEC-registered advisory service. Past performance does not guarantee future results. Consult a licensed advisor before making investment decisions.

## License

MIT.
