# Handover — Fundamental Investor AI

A single document for the next Claude (or human) picking up this project. Read this first before doing anything.

Last updated: 2026-04-21 · v7 shipped · public on GitHub · CI green · auto-deploy live

---

## TL;DR — if you do nothing else, read this

**What this is:** A research-driven wealth-OS for long-term equity investors in India + US. Built from scratch over 3 weeks with Vishesh.

**Where it lives:**
- Live: https://fundamental-investor-ai.vercel.app
- Source: https://github.com/visheshkhurana/fundamental-investor-ai (public, MIT)
- Workspace copy: `/mnt/warren/fi-ai/` (plain file copy, not git-tracked — clone fresh if you want git)
- Supabase: project `djgxjcylmlirugnjlyry` (ap-south-1)
- Vercel: `prj_6JXYtqcYlgF1QPXxUEH57SqK55KT` on team `team_LLguUsQ6qib83uUV8L31OpmA`

**How to ship a change:**
1. `git clone https://github.com/visheshkhurana/fundamental-investor-ai.git` in sandbox
2. Edit
3. `npm test` locally (36 tests on pure-function engines)
4. `git push origin main` — CI runs, Vercel auto-deploys, ~25s end-to-end

**Working style the user prefers:**
- Decide and ship. Don't give option menus. Act on granted authority.
- Short, terse updates after work is done. No trailing summaries of what you just showed them.
- Never use emoji in files unless asked. Never add them to the UI.
- Don't ask clarifying questions for tasks that are well-specified. Just do.

---

## Quick reference

### Production surfaces

| Route | What it does | Notes |
|---|---|---|
| `/` | Hero + live search + waitlist | Animated hero (pure CSS keyframes, no framer) |
| `/s/:market/:symbol` | Stock dashboard (score + entry/exit + DCF + chart) | Dynamic OG image per ticker |
| `/curator` | NL stock screener via Claude | Reads `score_cache` |
| `/screen` | Preset filters (Buffett, Lynch, wide-moat, etc.) | |
| `/compare?a=m/s&b=m/s` | Head-to-head 19-metric diff | |
| `/lens` | Sector + style breakdown of your book | Reads `trading_positions` + `score_cache` |
| `/trade` | Paper trading (₹10L + $10k) | Atomic `place_order` RPC |
| `/trade/leaderboard` | Top portfolios | |
| `/portfolio` | LocalStorage watch/hold lists | No server-side state |
| `/estate` | India + US wealth-transfer checklist | Exports Markdown for heirs |
| `/assistant` | Streaming Claude chat | Per-stock context injection |
| `/learn/*` | Educational docs | |
| `/onboarding` | **v7** — 3-step profile+assets wizard | |
| `/allocation` | **v7 Tool 1** — target vs current donuts | |
| `/ideas` | **v7 Tool 8** — AI-ranked weekly picks | |

### API routes

All under `app/api/`. Authenticated by `x-client-id` header (localStorage UUID — no real auth).

- `/api/stock/:market/:symbol` — Yahoo fetch + score + populate `score_cache` (lazy)
- `/api/chart/:market/:symbol` — Price history for the dashboard chart
- `/api/search`, `/api/screen`, `/api/curate`, `/api/lens`
- `/api/trading/account` | `/api/trading/order` | `/api/trading/portfolio-review` — paper trading
- `/api/profile`, `/api/assets`, `/api/allocation` — v7 Foundation + Tool 1
- `/api/ideas`, `/api/ideas/feedback` — v7 Tool 8
- `/api/assistant` — streaming Claude
- `/api/waitlist` — email capture

### Files worth knowing

```
app/
  globals.css         Design tokens + primitives (.card, .chip-*, .field, .score-ring)
  layout.tsx          Root layout with Nav + footer
components/
  Nav.tsx             Fixed transparent → blurred on scroll
  ScoreBadge.tsx      Ring + verdict chip. Used everywhere.
  CategoryCard.tsx    Per-category weighted score block
  PriceChart.tsx      TradingView lightweight-charts
  EntryExitPanel.tsx  Tool 6 + Tool 7 rendering
lib/
  scoring.ts          Pure function. Takes Fundamentals, returns ScoreResult.
  signals.ts          Pure. entrySignal() and exitSignal()
  allocation.ts       Pure. targetAllocation() + currentAllocation()
  ideas.ts            Pure. rankIdea() + reasonTags()
  style.ts            Classifies a stock as quality/value/growth/balanced
  yahoo.ts            Yahoo Finance client (v3 constructor; module-cached crumb)
  supabase.ts         Supabase client with cache:"no-store" override
  clientId.ts         "use client" — localStorage UUID + apiFetch helper
  fmt.ts              Indian Lakh/Crore + verdict chips
  tradeReview.ts      Runs Claude on every order, writes to trade_notes
supabase/
  migrations/*.sql    9 reproducible migrations
  README.md           Migration order + CLI apply instructions
.github/workflows/
  ci.yml              typecheck + vitest on every push/PR
```

---

## Credentials (in auto-memory)

All three are saved in `/mnt/.auto-memory/reference_*.md` — just read them when needed:

- **GitHub PAT (classic, `repo` scope):** in `reference_github_token.md` — used for pushes and API
- **Vercel token:** in `reference_supabase_vercel_setup.md` — used for REST API + CLI
- **Supabase:** accessed via MCP directly, no token needed for DB ops
- **Anthropic key:** not in memory; already set as Vercel env var `ANTHROPIC_API_KEY`

The `.git-credentials` file at `/sessions/quirky-charming-shannon/.git-credentials` caches the GitHub token for git operations — pushes from the sandbox work automatically.

---

## The "how do I …" playbook

### Add a new page

1. Create `app/<route>/page.tsx`
2. Use `.card` + `.field` + `.chip` primitives; don't introduce new design tokens
3. Server component by default; add `"use client"` only if you need state/effects
4. Add the route to `components/Nav.tsx` TABS array if it's top-level
5. Add the route to `app/sitemap.ts` STATIC_ROUTES
6. Commit + push → CI runs → Vercel auto-deploys

### Add a new database column/table

1. Write the SQL. Apply via the Supabase MCP (`apply_migration` tool — takes `project_id`, `name`, `query`).
2. Save the same SQL to `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` in the repo so it's reproducible.
3. Update `supabase/README.md` migration table.
4. Commit + push.

### Add a new scoring signal

1. Edit `lib/scoring.ts` — the signals are pure checks that push a `ChecklistItem` with `weight`, `status`, `value`.
2. Update the test at `lib/scoring.test.ts` with a canonical expected behavior.
3. Run `npm test` locally to verify.
4. Commit + push — CI will re-verify.

### Add a new AI surface

1. Create `app/api/<name>/route.ts` following the streaming pattern in `app/api/assistant/route.ts`:
   - `export const runtime = "nodejs"`
   - `export const maxDuration = 60`
   - Stream response with `ReadableStream`, push `content_block_delta` chunks
   - Put JSON actions block at TOP of response if you want clickable CTAs (survives Vercel timeout)
2. On the client, parse with the pattern in `components/SuggestedMoves.tsx` (extract first `\`\`\`json ... \`\`\`` fence, render rest as prose).
3. Always include in the system prompt: "Only reference numbers in the context provided. Never invent figures."

### Deploy

Do nothing special — `git push origin main` triggers Vercel. Watch the build:

```bash
curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=prj_6JXYtqcYlgF1QPXxUEH57SqK55KT&teamId=team_LLguUsQ6qib83uUV8L31OpmA&limit=1"
```

CI status:

```bash
curl -sS -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/visheshkhurana/fundamental-investor-ai/actions/runs?per_page=1"
```

### Work on a feature locally

```bash
cd /sessions/quirky-charming-shannon
git clone https://github.com/visheshkhurana/fundamental-investor-ai.git fi-ai-repo
cd fi-ai-repo
npm install
npm run typecheck
npm test
# edit
git add -A && git commit -m "..." && git push
```

Local Next build (`npm run build`) **OOMs in the sandbox** — don't try. Let Vercel build remotely.

---

## Known gotchas — DO NOT re-break these

1. **Supabase no-store.** `lib/supabase.ts` overrides `global.fetch` with `cache: "no-store"`. Next 14's default caches DB reads silently — removing this override causes stale-read bugs you'll waste days on.

2. **Upsert-never-resets pattern.** Any `upsert` into `trading_accounts` must pass `{ onConflict: "client_id", ignoreDuplicates: true }`. Otherwise every page visit nukes the user's cash balance. This is in `app/api/trading/account/route.ts`.

3. **Yahoo v3 constructor.** `yahoo-finance2@^3` needs `new YahooFinance()`. v2 used a default export — don't regress.

4. **Claude streaming + Vercel 60s.** Always put JSON actions block at TOP of the response. If the stream truncates at 60s, you still got the buttons. See `app/api/trading/portfolio-review/route.ts`.

5. **OG image fonts.** Default satori fonts lack ₹ (U+20B9). `app/s/[market]/[symbol]/opengraph-image.tsx` fetches `Roboto-Regular.ttf` (~515KB) from Google's GitHub. Do not switch to Noto Sans VF — it's a variable font and satori can't parse it.

6. **Particles.tsx bg-white.** Any bulk dark-mode codemod over `bg-white` must skip `components/hero/Particles.tsx` — those dots literally need to be white.

7. **Altman Z / DCF sanity caps.** `scoreStock()` clips Altman Z outside [-5, 25] and DCF ratio outside [0.2, 5x] to null. These approximations blow up for unusual balance sheets otherwise.

8. **Tool 7 exit is partial.** No tax-lot history exists, so exit triggers only check "currently holding?" + score break + Altman distress + 20% concentration. Full India LTCG/STCG logic is pending.

9. **ZOMATO → ETERNAL.** That ticker was renamed; stocks table has the correct entry. Don't re-add ZOMATO.

---

## Pending work (priority ordered)

### High-leverage launch prep
- **Pre-warm the score_cache** before HN submission (script at `/tmp/prewarm-v2.sh` in last session — respects Yahoo rate limits with 3s throttle). Target: all 165 stocks cached. Current: ~165/165 as of last run.
- **Fresh screenshots** for the 4 launch post drafts in `/mnt/warren/launch/`. Need: home, stock dashboard, curator result, portfolio review, allocation donuts, ideas cards.
- **Pin a GitHub issue** labeled "roadmap / feature requests" so launch feedback has a home.
- **Strengthen disclaimer.** Current footer is one line. A `/disclaimer` page with model, data, and limitations sections would pre-empt HN/Reddit pushback.

### Tool gaps (the 10-tool wealth OS)
- **Tool 2 — Tax-lot optimizer.** India LTCG/STCG aware sell suggestions. Needs `trading_lots` table + FIFO/LIFO selector. The single highest-leverage feature for Indian users.
- **Tool 3 — Monte Carlo retirement calculator.** Inputs: age, corpus, monthly contribution, target retirement age. Output: distribution of terminal portfolio values.
- **Tool 7 (full version) — Exit with real tax-lots.** Depends on Tool 2's schema.
- **Tool 9 — Spend/budget tracker.** Bank statement CSV import (HDFC, ICICI, SBI formats). Categorization with Claude.

### Platform / infrastructure
- **Real auth.** Move from localStorage UUID to Supabase Auth (magic links — no password friction). All existing `client_id` fields should become `user_id` with a migration.
- **News signals ingest.** `news_signals` table has 6 manually seeded rows. Needs a daily cron scraping Moneycontrol + Yahoo Finance RSS + Economic Times, writing to the table. Ideas tool's "news tailwind" bonus depends on this.
- **Weekly email digest.** `weekly_ideas` archives exist; nothing delivers them. Integrate Resend or Postmark + Vercel cron job Sunday 9am IST.
- **Mobile nav audit.** Most v7 surfaces (`/onboarding`, `/allocation`, `/ideas`) haven't been tested on sub-640px widths.

---

## The 10-tool roadmap (original spec)

| # | Tool | Status | Notes |
|--:|---|---|---|
| 1 | Wealth allocation | ✅ shipped | `/allocation` |
| 2 | Tax-lot optimizer | ❌ not started | India LTCG/STCG math + `trading_lots` |
| 3 | Retirement calculator | ❌ not started | Monte Carlo |
| 4 | Portfolio Lens (sector) | ✅ shipped | Merged into `/lens` with Tool 5 |
| 5 | Portfolio Lens (style) | ✅ shipped | Same |
| 6 | Entry signal | ✅ shipped | `components/EntryExitPanel.tsx` |
| 7 | Exit signal | ⚠️ partial | Score/distress/concentration only, no tax lots |
| 8 | Ideas generation | ✅ shipped | `/ideas` |
| 9 | Spend/budget tracker | ❌ not started | CSV import + Claude categorization |
| 10 | Estate checklist | ✅ shipped | `/estate` with Markdown export |

**Biggest unbuilt bet:** Tool 2 (tax optimizer). Indian users hit tax-lot decisions constantly; no tool in market does this well.

**Biggest shipped compounder:** Tool 8 (ideas). Brings users back weekly. Gets better as news pipeline matures.

---

## How Vishesh likes to work

From memory + observed patterns:

- **Decide and ship.** He says "decide" or "go" a lot. That means: pick the highest-leverage option yourself, execute it, and report back what shipped. Don't enumerate choices unless truly 50/50.
- **Terse updates.** He can read a diff. Don't recap what you just did. Give the verdict, the link, and what's next if relevant.
- **No emojis in files or UI.** Unless explicitly asked. Conversation is fine.
- **Trust the numbers.** When he asks for judgment calls (allocation defaults, ranking weights, which feature to build), give specific choices with one-line rationales. Never "here are some options."
- **Persist decisions.** When the user says "always remember X" — save to auto-memory as a reference record, including a why/when note.
- **He's a founder, not a junior dev.** He cares about leverage and compounding features, not code aesthetics or test coverage for its own sake. Ship things users notice.

---

## First actions for next session

Assuming a fresh Claude Cowork session starts cold:

1. Read this file (`/mnt/warren/HANDOVER.md`).
2. Read the relevant auto-memory: `/mnt/.auto-memory/MEMORY.md` indexes everything; the project + setup + tokens files have the specifics.
3. Ask what the user wants: launch today? Ship Tool 2? Fix a bug? Write code for something else entirely?
4. If shipping code for this project: clone fresh into the sandbox, don't try to work out of `/mnt/warren/fi-ai/` (not git-tracked).
5. Always `npm test` before pushing. The CI will catch type errors but a local test run saves a push/CI cycle.

Good luck. You're picking up a shipped product with a clean pipeline. The hard part is already done.
