create table public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  snapshot_date date not null,
  total_value numeric(18,4) not null,
  delta_value numeric(18,4),
  delta_pct numeric(8,4),
  breakdown_json jsonb,
  created_at timestamptz default now(),
  unique (user_id, snapshot_date)
);

alter table public.daily_snapshots enable row level security;

create policy "Users can view own snapshots"
  on public.daily_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert own snapshots"
  on public.daily_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own snapshots"
  on public.daily_snapshots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own snapshots"
  on public.daily_snapshots for delete
  using (auth.uid() = user_id);

create policy "Service role has full access to snapshots"
  on public.daily_snapshots for all
  using (auth.role() = 'service_role');
