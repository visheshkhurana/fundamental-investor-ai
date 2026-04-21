# Supabase migrations

Schema for the `fundamental-investor-ai` Supabase project (`djgxjcylmlirugnjlyry`, ap-south-1).

Files are named with the Supabase CLI convention: `<version>_<name>.sql`. Apply them in order.

## Applying

Via the Supabase CLI:

```bash
npx supabase link --project-ref djgxjcylmlirugnjlyry
npx supabase db push
```

Or copy each SQL file's contents into the Supabase SQL editor and run top to bottom.

## Migration order

| Order | File | What it adds |
|------:|------|---|
| 1 | `20260420094202_init_schema.sql` | Core tables: markets, industries, stocks, fundamentals_cache, stock_analyses, ai_conversations, ai_messages |
| 2 | `20260420094222_seed_markets_and_stocks.sql` | 4 markets (NSE/BSE/NYSE/NASDAQ) + 30 featured stocks |
| 3 | `20260420112630_expand_stock_universe_v2.sql` | ~135 additional tickers (Nifty 100 + S&P 100) |
| 4 | `20260420114327_paper_trading.sql` | trading_accounts, trading_orders, trading_positions + atomic `place_order()` RPC |
| 5 | `20260420115533_score_cache.sql` | score_cache for fast dashboards (lazy-written on visit) |
| 6 | `20260420122712_trade_notes.sql` | trade_notes for Claude's per-order review |
| 7 | `20260420131125_waitlist.sql` | waitlist (email capture) |
| 8 | `20260420151857_foundation_user_profile_and_assets.sql` | **v7 Foundation**: user_profile, asset_holdings (9-class enum), allocation_recommendations |
| 9 | `20260420151919_tool8_news_signals_and_ideas.sql` | **v7 Tool 8**: news_signals, user_preferences, weekly_ideas, idea_feedback |

## RLS

All tables disable RLS for the MVP — access is controlled server-side via the `x-client-id` header and the anon key is the publishable key. Re-enable RLS + write proper policies before adding real auth.

## Environment

The app expects:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

The anon / publishable key is safe to embed. Service-role keys are never committed or needed at runtime.
