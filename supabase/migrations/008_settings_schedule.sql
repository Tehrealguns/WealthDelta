-- Add scheduling columns to user_settings
alter table public.user_settings
  add column if not exists email_days text default 'mon,tue,wed,thu,fri',
  add column if not exists focus_areas text default '',
  add column if not exists pdf_days text default '';

comment on column public.user_settings.email_days is 'Comma-separated days: mon,tue,wed,thu,fri,sat,sun';
comment on column public.user_settings.focus_areas is 'What the AI should focus on in briefings (e.g. gold, crypto, FX)';
comment on column public.user_settings.pdf_days is 'Comma-separated days for PDF attachment. Empty = follow include_pdf for all days';
