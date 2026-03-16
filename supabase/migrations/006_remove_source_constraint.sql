-- Remove the restrictive source constraint to allow any bank/custodian name
alter table public.holdings drop constraint if exists holdings_source_check;
