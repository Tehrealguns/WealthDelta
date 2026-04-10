-- Track uploaded files for re-extraction support
create table public.vault_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  source text not null,
  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  description text,
  holdings_extracted integer default 0,
  last_extracted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.vault_files enable row level security;

create policy "Users can view own vault files"
  on public.vault_files for select using (auth.uid() = user_id);
create policy "Users can insert own vault files"
  on public.vault_files for insert with check (auth.uid() = user_id);
create policy "Users can update own vault files"
  on public.vault_files for update using (auth.uid() = user_id);
create policy "Users can delete own vault files"
  on public.vault_files for delete using (auth.uid() = user_id);
