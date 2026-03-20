import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json(
      { error: 'Failed to load settings', details: error.message },
      { status: 500 },
    );
  }

  const defaults = {
    custom_instructions: '',
    watch_items: '',
    email_enabled: true,
    email_time: '07:00',
    include_pdf: true,
    email_days: 'mon,tue,wed,thu,fri',
    focus_areas: '',
    pdf_days: '',
  };

  return NextResponse.json({ settings: data ?? defaults });
}

interface SettingsBody {
  custom_instructions?: string;
  watch_items?: string;
  email_enabled?: boolean;
  email_time?: string;
  include_pdf?: boolean;
  email_days?: string;
  focus_areas?: string;
  pdf_days?: string;
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as SettingsBody;

  const row: Record<string, unknown> = {
    user_id: userData.user.id,
    updated_at: new Date().toISOString(),
  };

  if (body.custom_instructions !== undefined) row.custom_instructions = body.custom_instructions;
  if (body.watch_items !== undefined) row.watch_items = body.watch_items;
  if (body.email_enabled !== undefined) row.email_enabled = body.email_enabled;
  if (body.email_time !== undefined) row.email_time = body.email_time;
  if (body.include_pdf !== undefined) row.include_pdf = body.include_pdf;
  if (body.email_days !== undefined) row.email_days = body.email_days;
  if (body.focus_areas !== undefined) row.focus_areas = body.focus_areas;
  if (body.pdf_days !== undefined) row.pdf_days = body.pdf_days;

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save settings', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: 'Settings saved', settings: data });
}
