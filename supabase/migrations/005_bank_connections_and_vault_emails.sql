-- Bank connections (for API-based banks: Basiq, Flanks)
create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  provider text not null check (provider in ('basiq', 'yodlee')),
  connection_id text not null,
  credentials_encrypted text,
  institution_name text,
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, provider, connection_id)
);

alter table public.bank_connections enable row level security;

create policy "Users can view own connections"
  on public.bank_connections for select using (auth.uid() = user_id);
create policy "Users can insert own connections"
  on public.bank_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own connections"
  on public.bank_connections for update using (auth.uid() = user_id);
create policy "Users can delete own connections"
  on public.bank_connections for delete using (auth.uid() = user_id);

-- Vault email addresses (unique per user for email forwarding)
create table public.vault_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  email_slug text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.vault_emails enable row level security;

create policy "Users can view own vault email"
  on public.vault_emails for select using (auth.uid() = user_id);
create policy "Users can insert own vault email"
  on public.vault_emails for insert with check (auth.uid() = user_id);

-- Ingested emails (for deduplication and audit trail)
create table public.ingested_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  message_id text not null,
  from_address text,
  subject text,
  received_at timestamptz default now(),
  status text not null default 'processed' check (status in ('processed', 'failed', 'duplicate', 'ignored')),
  holdings_extracted integer default 0,
  raw_body_preview text,
  error_message text,
  created_at timestamptz default now(),
  unique (user_id, message_id)
);

alter table public.ingested_emails enable row level security;

create policy "Users can view own ingested emails"
  on public.ingested_emails for select using (auth.uid() = user_id);
