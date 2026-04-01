import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const secret = process.env.INGEST_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'INGEST_WEBHOOK_SECRET not configured' },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    to: string;
    from: string;
    subject: string;
    text: string;
    messageId: string;
  };

  // Use the server's own origin, never the client-supplied Origin header
  const origin = request.nextUrl.origin;

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
