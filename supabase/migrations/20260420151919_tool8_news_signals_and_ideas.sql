-- v7 Tool 8: news signals + weekly ideas archive + feedback

-- News signals: per-stock, per-date sentiment + topic
create table if not exists public.news_signals (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  symbol text not null,
  published_at timestamptz not null,
  source text,
  headline text not null,
  url text,
  sentiment numeric check (sentiment between -1 and 1), -- -1 very negative .. +1 very positive
  topic text,                          -- 'earnings' | 'guidance' | 'mna' | 'product' | 'regulatory' | 'macro'
  summary text,
  created_at timestamptz default now()
);

create index if not exists news_signals_symbol_idx on public.news_signals (market, symbol, published_at desc);
create index if not exists news_signals_recent_idx on public.news_signals (published_at desc);

-- User preferences inferred from behavior (for idea ranking)
create table if not exists public.user_preferences (
  client_id text primary key,
  preferred_sectors text[] default '{}',      -- sectors user has bought or watched
  preferred_styles text[] default '{}',       -- 'value' | 'quality' | 'growth'
  avoided_tickers text[] default '{}',        -- sold or dismissed
  risk_tilt numeric default 0,                -- -1 conservative .. +1 aggressive, derived from risk_tolerance
  last_computed_at timestamptz default now()
);

-- Weekly idea archive (one row per client per week)
create table if not exists public.weekly_ideas (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  week_start date not null,                   -- Monday of that week
  picks jsonb not null,                       -- [{ market, symbol, score, thesis, reason_tags }]
  email_delivered_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz default now(),
  unique (client_id, week_start)
);

create index if not exists weekly_ideas_client_idx on public.weekly_ideas (client_id, week_start desc);

-- Idea dismissals (user thumbs-down)
create table if not exists public.idea_feedback (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  market text not null,
  symbol text not null,
  action text not null,                       -- 'dismiss' | 'watch' | 'buy'
  reason text,
  created_at timestamptz default now()
);

create index if not exists idea_feedback_client_idx on public.idea_feedback (client_id, created_at desc);
