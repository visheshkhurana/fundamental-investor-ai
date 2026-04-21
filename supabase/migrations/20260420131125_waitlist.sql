create table if not exists waitlist (
  id         bigserial primary key,
  email      citext unique not null,
  source     text,                 -- 'homepage' | 'learn' | 'review' etc.
  referrer   text,
  created_at timestamptz not null default now()
);
create index if not exists idx_waitlist_created on waitlist (created_at desc);
alter table waitlist disable row level security;
