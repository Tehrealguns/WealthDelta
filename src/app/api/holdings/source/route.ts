import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { source } = (await request.json()) as { source?: string };

  if (!source || typeof source !== 'string') {
    return NextResponse.json({ error: 'source is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('holdings')
    .delete()
    .eq('user_id', user.id)
    .eq('source', source)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: data?.length ?? 0 });
}
