-- v7 Foundation: user profile + polymorphic asset holdings + allocation snapshots

-- User profile: captures demographics, risk tolerance, income, tax residence
create table if not exists public.user_profile (
  client_id text primary key,
  display_name text,
  age int check (age between 16 and 100),
  dependents int default 0,
  risk_tolerance int check (risk_tolerance between 1 and 5), -- 1 = capital preservation, 5 = aggressive growth
  tax_residence text, -- 'IN' or 'US' typically
  primary_currency text default 'INR', -- 'INR' | 'USD'
  monthly_income_inr numeric,
  monthly_income_usd numeric,
  monthly_expenses_inr numeric,
  monthly_expenses_usd numeric,
  retire_target_age int,
  net_worth_goal_inr numeric,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Polymorphic asset holdings (covers all 9 asset classes)
create type asset_class as enum (
  'public_equity',     -- stocks (can also be rolled up from trading_positions)
  'debt',              -- FDs, bonds, debt MFs, PF, PPF, treasury bills
  'real_estate',       -- primary home, investment properties
  'bullion',           -- gold (physical + digital + ETFs), silver
  'crypto',            -- BTC, ETH, etc.
  'art',               -- paintings, collectibles, watches
  'alternates',        -- REITs, InvITs, hedge funds, structured products
  'private_companies', -- angel investments, own startup equity, private holdings
  'cash'               -- checking + savings (liquidity floor tracking)
);

create table if not exists public.asset_holdings (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  asset_class asset_class not null,
  subtype text,                        -- e.g. 'primary_home', 'fd', 'ppf', 'rental', 'gold_etf'
  label text not null,                 -- user-facing label e.g. 'Mumbai Bandra flat'
  market_value_inr numeric,
  market_value_usd numeric,
  cost_basis numeric,
  acquired_on date,
  liquidity_days int default 1,        -- how many days to convert to cash
  notes text,
  metadata jsonb default '{}'::jsonb,  -- flexible: rental_yield, interest_rate, lock-in, etc.
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists asset_holdings_client_idx on public.asset_holdings (client_id);
create index if not exists asset_holdings_class_idx on public.asset_holdings (client_id, asset_class);

-- Allocation recommendations (snapshot per computation)
create table if not exists public.allocation_recommendations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  computed_at timestamptz default now(),
  current_allocation jsonb not null,   -- { public_equity: 0.35, debt: 0.20, ... }
  target_allocation jsonb not null,
  delta_pp jsonb not null,             -- percentage-point differences
  rationale_md text,                   -- Claude-written reasoning
  total_nav_inr numeric,
  total_nav_usd numeric
);

create index if not exists alloc_rec_client_idx on public.allocation_recommendations (client_id, computed_at desc);
