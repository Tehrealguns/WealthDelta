import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { getEmailParsePrompt } from '@/lib/bank-registry';
import type { UnifiedPortfolio } from '@/lib/types';

const INGEST_SECRET = process.env.INGEST_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!INGEST_SECRET || authHeader !== `Bearer ${INGEST_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, serviceKey);

  const contentType = request.headers.get('content-type') ?? '';
  let toAddress = '';
  let fromAddress = '';
  let subject = '';
  let textBody = '';
  let messageId = '';
  let attachmentBase64: string | null = null;
  let attachmentMediaType: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    toAddress = (formData.get('to') as string) ?? '';
    fromAddress = (formData.get('from') as string) ?? '';
    subject = (formData.get('subject') as string) ?? '';
    textBody = (formData.get('text') as string) ?? (formData.get('html') as string) ?? '';
    messageId = (formData.get('Message-ID') as string) ?? (formData.get('message-id') as string) ?? `${Date.now()}`;

    const attachmentCount = Math.min(parseInt((formData.get('attachments') as string) ?? '0', 10) || 0, 10);
    for (let i = 1; i <= Math.max(attachmentCount, 3); i++) {
      const file = formData.get(`attachment${i}`) as File | null;
      if (file && file.type === 'application/pdf') {
        const bytes = await file.arrayBuffer();
        attachmentBase64 = Buffer.from(bytes).toString('base64');
        attachmentMediaType = 'application/pdf';
        break;
      }
    }
  } else {
    let body: Record<string, string>;
    try {
      body = await request.json() as Record<string, string>;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    toAddress = body.to ?? '';
    fromAddress = body.from ?? '';
    subject = body.subject ?? '';
    textBody = body.text ?? body.html ?? '';
    messageId = body.messageId ?? body['Message-ID'] ?? `${Date.now()}`;
  }

  const emailSlug = toAddress.split('@')[0]?.toLowerCase().trim();
  if (!emailSlug) {
    return NextResponse.json({ error: 'No recipient' }, { status: 400 });
  }

  const { data: vaultEmail } = await supabase
    .from('vault_emails')
    .select('user_id, is_active')
    .eq('email_slug', emailSlug)
    .single();

  if (!vaultEmail || !vaultEmail.is_active) {
    return NextResponse.json({ error: 'Unknown vault email' }, { status: 404 });
  }

  const userId = vaultEmail.user_id;

  const { data: existing } = await supabase
    .from('ingested_emails')
    .select('id')
    .eq('user_id', userId)
    .eq('message_id', messageId)
    .single();

  if (existing) {
    return NextResponse.json({ message: 'Duplicate, skipped' });
  }

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch {
    await supabase.from('ingested_emails').insert({
      user_id: userId,
      message_id: messageId,
      from_address: fromAddress,
      subject,
      status: 'failed',
      error_message: 'Anthropic API not configured',
      raw_body_preview: textBody.slice(0, 500),
    });
    return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
  }

  const userContent: Array<{ type: string; [key: string]: unknown }> = [];

  if (attachmentBase64 && attachmentMediaType) {
    userContent.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: attachmentMediaType,
        data: attachmentBase64,
      },
    });
  }

  const parsePrompt = getEmailParsePrompt(fromAddress);

  userContent.push({
    type: 'text',
    text: `${parsePrompt}\n\n--- EMAIL ---\nFrom: ${fromAddress}\nSubject: ${subject}\nDate: ${new Date().toISOString()}\n\n${textBody.slice(0, 10000)}`,
  });

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: userContent as never }],
  });

  const responseText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  let holdings: (UnifiedPortfolio & { event_type?: string })[];
  try {
    const cleaned = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    holdings = JSON.parse(cleaned);
    if (!Array.isArray(holdings)) throw new Error('Not an array');
  } catch {
    await supabase.from('ingested_emails').insert({
      user_id: userId,
      message_id: messageId,
      from_address: fromAddress,
      subject,
      status: 'failed',
      error_message: 'Could not parse holdings from email',
      raw_body_preview: textBody.slice(0, 500),
    });
    return NextResponse.json({ message: 'No holdings extracted' });
  }

  if (holdings.length === 0) {
    await supabase.from('ingested_emails').insert({
      user_id: userId,
      message_id: messageId,
      from_address: fromAddress,
      subject,
      status: 'ignored',
      holdings_extracted: 0,
      raw_body_preview: textBody.slice(0, 500),
    });
    return NextResponse.json({ message: 'No financial data found' });
  }

  const rows = holdings
    .filter((h) => h.event_type !== 'sell')
    .map((h) => ({
      user_id: userId,
      asset_id: h.asset_id,
      source: h.source,
      asset_name: h.asset_name,
      asset_class: h.asset_class,
      ticker_symbol: h.ticker_symbol,
      quantity: h.quantity ?? null,
      valuation_base: h.valuation_base,
      valuation_date: h.valuation_date,
      currency: h.currency ?? 'AUD',
      is_static: true,
    }));

  const sellIds = holdings
    .filter((h) => h.event_type === 'sell')
    .map((h) => h.asset_id);

  if (rows.length > 0) {
    await supabase
      .from('holdings')
      .upsert(rows, { onConflict: 'user_id,asset_id' });
  }

  if (sellIds.length > 0) {
    await supabase
      .from('holdings')
      .delete()
      .eq('user_id', userId)
      .in('asset_id', sellIds);
  }

  await supabase.from('ingested_emails').insert({
    user_id: userId,
    message_id: messageId,
    from_address: fromAddress,
    subject,
    status: 'processed',
    holdings_extracted: holdings.length,
    raw_body_preview: textBody.slice(0, 500),
  });

  return NextResponse.json({
    message: `Processed ${holdings.length} items`,
    extracted: holdings.length,
    updated: rows.length,
    sold: sellIds.length,
  });
}
