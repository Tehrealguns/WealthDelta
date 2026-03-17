alter table public.holdings
  add column if not exists quantity numeric(18,6) default null,
  add column if not exists currency text default 'AUD';
