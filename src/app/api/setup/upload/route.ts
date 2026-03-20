import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { UnifiedPortfolio } from '@/lib/types';

export const maxDuration = 300;

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function isImage(file: File): boolean {
  if (IMAGE_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|webp|gif)$/.test(name);
}

function isPdf(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

const PROMPT = `You are a financial data extraction engine. Extract ALL holdings/assets from this document — it could be a bank statement, portfolio report, screenshot, spreadsheet export, or any financial document.

Return ONLY a JSON array. Each object must have exactly these fields:
- asset_id: a unique slug (lowercase, e.g. "ubs-eq-bhp-001")
- source: the bank/custodian/platform name as best you can determine
- asset_name: full name of the holding
- asset_class: one of "Equity", "Bond", "Cash", "Alternative", "Private Equity"
- ticker_symbol: stock/ETF ticker in Yahoo Finance format (e.g. "BHP.AX", "AAPL"). null if not listed.
- quantity: number of shares/units. null for cash or if unavailable.
- valuation_base: total market value as a number (no currency symbols, no commas)
- valuation_date: ISO date "YYYY-MM-DD" from the document. Use today if unclear.
- currency: 3-letter currency code (e.g. "AUD", "USD")
- is_static: true

Extract EVERY holding. Include cash balances as "Cash". If you cannot extract structured data, return [].
Return ONLY the JSON array, no markdown, no explanation.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const fileName = formData.get('fileName') as string | null;
  const portfolioName = formData.get('portfolioName') as string | null;
  const fileDescription = formData.get('description') as string | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'AI not configured', details: err instanceof Error ? err.message : 'Set ANTHROPIC_API_KEY' },
      { status: 500 },
    );
  }

  const contextParts = [PROMPT];
  if (fileDescription) contextParts.push(`\nUSER DESCRIPTION: ${fileDescription}`);
  if (portfolioName) contextParts.push(`\nPORTFOLIO/SOURCE NAME: ${portfolioName}`);
  const fullPrompt = contextParts.join('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [];

  try {
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    if (isPdf(file)) {
      contentBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      });
    } else if (isImage(file)) {
      const mediaType = file.type || 'image/png';
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      });
    } else {
      const text = new TextDecoder('utf-8').decode(bytes);
      contentBlocks.push({
        type: 'text',
        text: `FILE: ${fileName ?? file.name}\n\n${text.slice(0, 100_000)}`,
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to read file', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }

  contentBlocks.push({ type: 'text', text: fullPrompt });

  let message;
  try {
    message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 16384,
      messages: [{ role: 'user', content: contentBlocks }],
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'AI extraction failed', details: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }

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
      { error: 'Could not extract holdings. Try adding a description to help.', rawResponse: responseText.slice(0, 500) },
      { status: 422 },
    );
  }

  if (holdings.length === 0) {
    return NextResponse.json({ message: 'No holdings found', holdings: [], count: 0 });
  }

  const rows = holdings.map((item) => ({
    user_id: userData.user.id,
    asset_id: item.asset_id,
    source: portfolioName || item.source,
    asset_name: item.asset_name,
    asset_class: item.asset_class,
    ticker_symbol: item.ticker_symbol,
    quantity: item.quantity ?? null,
    valuation_base: item.valuation_base,
    valuation_date: item.valuation_date,
    currency: item.currency ?? 'AUD',
    is_static: true,
  }));

  const { data, error } = await supabase
    .from('holdings')
    .upsert(rows, { onConflict: 'user_id,asset_id' })
    .select();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Extracted ${data.length} holdings`,
    count: data.length,
    holdings: data,
    source: holdings[0]?.source ?? 'Unknown',
  });
}
