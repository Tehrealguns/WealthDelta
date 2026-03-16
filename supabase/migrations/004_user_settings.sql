create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  custom_instructions text default '',
  watch_items text default '',
  email_enabled boolean default true,
  email_time text default '07:00',
  include_pdf boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_settings enable row level security;

create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
