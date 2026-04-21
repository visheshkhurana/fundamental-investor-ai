-- Core reference tables
create extension if not exists pg_trgm;
create extension if not exists citext;

create table if not exists markets (
  code text primary key,
  country text not null,
  currency text not null,
  tz text not null,
  display_name text not null
);

create table if not exists industries (
  id serial primary key,
  gics_code text unique,
  name text not null unique,
  parent_id int references industries(id)
);

create table if not exists stocks (
  id bigserial primary key,
  market text not null references markets(code),
  symbol text not null,
  name text not null,
  industry text,
  is_active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique (market, symbol)
);
create index if not exists idx_stocks_symbol on stocks (symbol);
create index if not exists idx_stocks_name_trgm on stocks using gin (name gin_trgm_ops);

-- Cached fundamentals + quotes (latest-only to keep it simple for MVP)
create table if not exists fundamentals_cache (
  stock_id bigint primary key references stocks(id) on delete cascade,
  data jsonb not null,
  fetched_at timestamptz not null default now()
);

-- Saved analyses (audit trail of every scoring run the user chose to save)
create table if not exists stock_analyses (
  id bigserial primary key,
  client_id text,         -- anonymous device ID (localStorage) while auth is deferred
  stock_id bigint not null references stocks(id),
  total_score numeric(5,2) not null,
  verdict text not null,
  scores_by_cat jsonb not null,
  payload jsonb not null,   -- full items + advanced
  created_at timestamptz not null default now()
);
create index if not exists idx_analysis_client on stock_analyses (client_id, created_at desc);
create index if not exists idx_analysis_stock on stock_analyses (stock_id, created_at desc);

-- AI conversations (assistant history; client_id-scoped for MVP)
create table if not exists ai_conversations (
  id bigserial primary key,
  client_id text,
  stock_id bigint references stocks(id),
  title text,
  created_at timestamptz not null default now()
);
create table if not exists ai_messages (
  id bigserial primary key,
  conversation_id bigint not null references ai_conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb,
  created_at timestamptz not null default now()
);
