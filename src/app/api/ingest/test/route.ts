import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as {
    to: string;
    from: string;
    subject: string;
    text: string;
    messageId: string;
  };

  const secret = process.env.INGEST_WEBHOOK_SECRET ?? '';
  const origin = request.headers.get('origin') ?? request.nextUrl.origin;

  const res = await fetch(`${origin}/api/ingest/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  return NextResponse.json(json, { status: res.status });
}
