import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { getBankPrompt } from '@/lib/bank-registry';
import type { UnifiedPortfolio } from '@/lib/types';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json(
      { error: 'Not authenticated', details: 'Sign in first' },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Invalid file', details: 'Upload a PDF file' },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'AI not configured', details: err instanceof Error ? err.message : 'Set ANTHROPIC_API_KEY' },
      { status: 500 },
    );
  }

  const prompt = getBankPrompt(file.name);

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const responseText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  let holdings: UnifiedPortfolio[];
  try {
    const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    holdings = JSON.parse(cleaned) as UnifiedPortfolio[];
    if (!Array.isArray(holdings)) throw new Error('Not an array');
  } catch {
    return NextResponse.json(
      { error: 'Extraction failed', details: 'Could not parse holdings from this PDF. Try a clearer statement.' },
      { status: 422 },
    );
  }

  if (holdings.length === 0) {
    return NextResponse.json(
      { error: 'No holdings found', details: 'The PDF did not contain recognizable asset data.' },
      { status: 422 },
    );
  }

  const rows = holdings.map((item) => ({
    user_id: userData.user.id,
    asset_id: item.asset_id,
    source: item.source,
    asset_name: item.asset_name,
    asset_class: item.asset_class,
    ticker_symbol: item.ticker_symbol,
    valuation_base: item.valuation_base,
    valuation_date: item.valuation_date,
    is_static: true,
  }));

  const { data, error } = await supabase
    .from('holdings')
    .upsert(rows, { onConflict: 'user_id,asset_id' })
    .select();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save holdings', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Extracted ${data.length} holdings`,
    count: data.length,
  });
}
