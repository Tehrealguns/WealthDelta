import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as {
    custom_instructions?: string;
    watch_items?: string;
    email_enabled?: boolean;
    email_time?: string;
    include_pdf?: boolean;
  };

  const { data, error } = await supabase
    .from('user_settings')
    .upsert(
      {
        user_id: userData.user.id,
        custom_instructions: body.custom_instructions ?? '',
        watch_items: body.watch_items ?? '',
        email_enabled: body.email_enabled ?? true,
        email_time: body.email_time ?? '07:00',
        include_pdf: body.include_pdf ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
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
