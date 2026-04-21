-- Paper trading: anonymous accounts keyed by a client-generated UUID in localStorage
create table if not exists trading_accounts (
  id         bigserial primary key,
  client_id  text unique not null,
  cash_inr   numeric(20,2) not null default 1000000,   -- ₹10 Lakh starting balance
  cash_usd   numeric(20,2) not null default 10000,     -- $10,000 starting balance
  created_at timestamptz not null default now()
);

create table if not exists trading_orders (
  id          bigserial primary key,
  account_id  bigint not null references trading_accounts(id) on delete cascade,
  stock_id    bigint not null references stocks(id),
  market      text not null,          -- denormalized for fast list
  symbol      text not null,
  side        text not null check (side in ('buy','sell')),
  qty         numeric(20,4) not null check (qty > 0),
  price       numeric(20,4) not null,
  currency    text not null,
  total       numeric(20,4) not null,  -- qty * price
  executed_at timestamptz not null default now()
);
create index if not exists idx_orders_account_time on trading_orders (account_id, executed_at desc);

create table if not exists trading_positions (
  account_id bigint not null references trading_accounts(id) on delete cascade,
  stock_id   bigint not null references stocks(id),
  market     text not null,
  symbol     text not null,
  name       text,
  qty        numeric(20,4) not null,
  avg_cost   numeric(20,4) not null,
  currency   text not null,
  updated_at timestamptz not null default now(),
  primary key (account_id, stock_id)
);

-- Atomic order placement. Returns the new order row + updated cash.
-- Validates: buying within cash; selling within held qty.
create or replace function place_order(
  p_client_id text,
  p_market    text,
  p_symbol    text,
  p_name      text,
  p_side      text,
  p_qty       numeric,
  p_price     numeric,
  p_currency  text
) returns jsonb
language plpgsql as $$
declare
  v_account_id bigint;
  v_stock_id   bigint;
  v_cash       numeric;
  v_total      numeric := p_qty * p_price;
  v_pos_qty    numeric;
  v_pos_cost   numeric;
  v_order_id   bigint;
begin
  if p_side not in ('buy','sell') then raise exception 'invalid side'; end if;
  if p_qty  <= 0 then raise exception 'qty must be positive'; end if;
  if p_price<= 0 then raise exception 'price must be positive'; end if;
  if p_currency not in ('INR','USD') then raise exception 'unsupported currency'; end if;

  insert into trading_accounts (client_id) values (p_client_id)
    on conflict (client_id) do nothing;
  select id into v_account_id from trading_accounts where client_id = p_client_id;

  select id into v_stock_id from stocks where market = p_market and symbol = p_symbol;
  if v_stock_id is null then raise exception 'unknown stock %/%', p_market, p_symbol; end if;

  -- Lock account row
  if p_currency = 'INR' then
    select cash_inr into v_cash from trading_accounts where id = v_account_id for update;
  else
    select cash_usd into v_cash from trading_accounts where id = v_account_id for update;
  end if;

  if p_side = 'buy' and v_cash < v_total then
    raise exception 'insufficient cash: have %, need %', v_cash, v_total;
  end if;

  if p_side = 'sell' then
    select qty into v_pos_qty from trading_positions
      where account_id = v_account_id and stock_id = v_stock_id for update;
    if v_pos_qty is null or v_pos_qty < p_qty then
      raise exception 'insufficient position: have %, selling %', coalesce(v_pos_qty,0), p_qty;
    end if;
  end if;

  -- Mutate cash
  if p_side = 'buy' then
    if p_currency = 'INR' then update trading_accounts set cash_inr = cash_inr - v_total where id = v_account_id;
    else update trading_accounts set cash_usd = cash_usd - v_total where id = v_account_id;
    end if;
  else
    if p_currency = 'INR' then update trading_accounts set cash_inr = cash_inr + v_total where id = v_account_id;
    else update trading_accounts set cash_usd = cash_usd + v_total where id = v_account_id;
    end if;
  end if;

  -- Upsert position
  if p_side = 'buy' then
    insert into trading_positions (account_id, stock_id, market, symbol, name, qty, avg_cost, currency)
      values (v_account_id, v_stock_id, p_market, p_symbol, p_name, p_qty, p_price, p_currency)
    on conflict (account_id, stock_id) do update
      set qty = trading_positions.qty + excluded.qty,
          avg_cost = ((trading_positions.qty * trading_positions.avg_cost) + (excluded.qty * excluded.avg_cost)) / (trading_positions.qty + excluded.qty),
          updated_at = now();
  else
    update trading_positions
      set qty = qty - p_qty, updated_at = now()
      where account_id = v_account_id and stock_id = v_stock_id;
    -- Close position if qty == 0
    delete from trading_positions where account_id = v_account_id and stock_id = v_stock_id and qty = 0;
  end if;

  -- Record order
  insert into trading_orders (account_id, stock_id, market, symbol, side, qty, price, currency, total)
    values (v_account_id, v_stock_id, p_market, p_symbol, p_side, p_qty, p_price, p_currency, v_total)
    returning id into v_order_id;

  return jsonb_build_object(
    'order_id', v_order_id,
    'account_id', v_account_id,
    'side', p_side, 'qty', p_qty, 'price', p_price, 'total', v_total, 'currency', p_currency
  );
end;
$$;

-- Allow anon access via RLS-bypassing function (or add policies; MVP: disable RLS on these)
alter table trading_accounts  disable row level security;
alter table trading_orders    disable row level security;
alter table trading_positions disable row level security;
