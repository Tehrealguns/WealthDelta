import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQuotes } from '@/lib/market-data';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as { symbols?: string[] };
  const symbols = body.symbols ?? [];

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  if (symbols.length > 100) {
    return NextResponse.json({ error: 'Max 100 symbols per request' }, { status: 400 });
  }

  const quotes = await getQuotes(symbols);
  const quotesObj = Object.fromEntries(quotes);

  return NextResponse.json({ quotes: quotesObj });
}
