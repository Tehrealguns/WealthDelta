create table public.briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  briefing_date date not null,
  summary_text text not null,
  prompt_tokens integer,
  completion_tokens integer,
  model text,
  custom_instructions text,
  created_at timestamptz default now(),
  unique (user_id, briefing_date)
);

alter table public.briefings enable row level security;

create policy "Users can view own briefings"
  on public.briefings for select
  using (auth.uid() = user_id);

create policy "Users can insert own briefings"
  on public.briefings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own briefings"
  on public.briefings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own briefings"
  on public.briefings for delete
  using (auth.uid() = user_id);
