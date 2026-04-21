create table if not exists score_cache (
  stock_id        bigint primary key references stocks(id) on delete cascade,
  market          text not null,
  symbol          text not null,
  name            text,
  industry        text,
  sector          text,
  currency        text,
  price           numeric(20,4),
  market_cap      numeric(20,4),
  total_score     numeric(5,2),
  verdict         text,
  cat_macro       numeric(5,2),
  cat_industry    numeric(5,2),
  cat_company     numeric(5,2),
  cat_valuation   numeric(5,2),
  cat_triggers    numeric(5,2),
  piotroski       int,
  altman_z        numeric(10,2),
  altman_zone     text,
  moat_type       text,
  moat_strength   text,
  pe              numeric(12,2),
  peg             numeric(10,2),
  de              numeric(10,2),
  fcf             numeric(20,2),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_score_cache_market        on score_cache (market);
create index if not exists idx_score_cache_total_score   on score_cache (total_score desc);
create index if not exists idx_score_cache_moat_strength on score_cache (moat_strength);
create index if not exists idx_score_cache_updated_at    on score_cache (updated_at desc);

alter table score_cache disable row level security;
