create table if not exists trade_notes (
  id          bigserial primary key,
  order_id    bigint not null unique references trading_orders(id) on delete cascade,
  account_id  bigint not null references trading_accounts(id) on delete cascade,
  verdict     text,            -- 'aligned' | 'mixed' | 'misaligned'
  content     text not null,
  model       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_trade_notes_account on trade_notes (account_id, created_at desc);

alter table trade_notes disable row level security;
