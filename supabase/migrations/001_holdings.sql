create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  asset_id text not null,
  source text not null check (source in ('UBS','Stonehage','JBWere','BellPotter')),
  asset_name text not null,
  asset_class text not null check (asset_class in ('Equity','Bond','Cash','Alternative','Private Equity')),
  ticker_symbol text,
  valuation_base numeric(18,4) not null,
  valuation_date date not null,
  is_static boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, asset_id)
);

alter table public.holdings enable row level security;

create policy "Users can view own holdings"
  on public.holdings for select
  using (auth.uid() = user_id);

create policy "Users can insert own holdings"
  on public.holdings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own holdings"
  on public.holdings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own holdings"
  on public.holdings for delete
  using (auth.uid() = user_id);

create policy "Service role has full access to holdings"
  on public.holdings for all
  using (auth.role() = 'service_role');
