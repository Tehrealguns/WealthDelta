import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import type { UnifiedPortfolio } from '@/lib/types';

export const maxDuration = 300;

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function isImage(file: File): boolean {
  if (IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|gif)$/.test(file.name.toLowerCase());
}

function isPdf(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

const PROMPT = `You are a financial data extraction engine. Extract ALL holdings/assets from this document — it could be a bank statement, portfolio report, screenshot, spreadsheet export, or any financial document.

First, briefly describe what you see in the document (2-3 sentences). Then output the JSON.

Return the holdings as a JSON array wrapped in a \`\`\`json code fence. Each object must have exactly these fields:
- asset_id: a unique slug (lowercase, e.g. "ubs-eq-bhp-001")
- source: the bank/custodian/platform name as best you can determine
- asset_name: full name of the holding
- asset_class: one of "Equity", "Bond", "Cash", "Alternative", "Private Equity", "Commodity", "Cryptocurrency", "Currency"
- ticker_symbol: stock/ETF/commodity/crypto ticker in Yahoo Finance format. CRITICAL ticker rules:
  * Australian equities: append ".AX" (e.g. "BHP.AX", "CBA.AX", "CSL.AX")
  * US equities: plain ticker (e.g. "AAPL", "MSFT", "GOOGL")
  * UK equities: append ".L" (e.g. "SHEL.L", "BP.L")
  * Gold: "GC=F" | Silver: "SI=F" | Platinum: "PL=F"
  * WTI Oil: "CL=F" | Brent Oil: "BZ=F" | Natural Gas: "NG=F"
  * Bitcoin: "BTC-USD" | Ethereum: "ETH-USD" | Solana: "SOL-USD"
  * ETFs: use their actual ticker (e.g. "VAS.AX", "SPY", "QQQ")
  * FX/Currency: use Yahoo format (e.g. "AUDUSD=X", "EURUSD=X")
  * null ONLY if truly unlisted (private equity, term deposits, etc.)
- quantity: number of shares/units/ounces/coins. null for cash balances or if unavailable.
- valuation_base: total market value as a number (no currency symbols, no commas)
- valuation_date: ISO date "YYYY-MM-DD" from the document. Use today if unclear.
- currency: 3-letter currency code (e.g. "AUD", "USD")
- is_static: true

Extract EVERY holding. Include cash balances as asset_class "Cash". Include managed funds, ETFs, commodities, crypto, and currency positions. If you cannot extract structured data, return an empty array [].`;

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return new Response(sseEvent({ type: 'error', message: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const fileName = formData.get('fileName') as string | null;
  const portfolioName = formData.get('portfolioName') as string | null;
  const fileDescription = formData.get('description') as string | null;
  const replaceSource = formData.get('replaceSource') as string | null;

  if (!file || file.size === 0) {
    return new Response(sseEvent({ type: 'error', message: 'No file uploaded' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return new Response(
      sseEvent({ type: 'error', message: err instanceof Error ? err.message : 'AI not configured' }),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
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
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: file.type || 'image/png', data: base64 },
      });
    } else {
      const text = new TextDecoder('utf-8').decode(bytes);
      contentBlocks.push({
        type: 'text',
        text: `FILE: ${fileName ?? file.name}\n\n${text.slice(0, 100_000)}`,
      });
    }
  } catch (err) {
    return new Response(
      sseEvent({ type: 'error', message: err instanceof Error ? err.message : 'Failed to read file' }),
      { status: 500, headers: { 'Content-Type': 'text/event-stream' } },
    );
  }

  contentBlocks.push({ type: 'text', text: fullPrompt });

  const userId = userData.user.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      let fullText = '';

      try {
        const response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 16384,
          stream: true,
          messages: [{ role: 'user', content: contentBlocks }],
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            'delta' in event &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullText += text;
            send({ type: 'token', text });
          }
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'AI extraction failed' });
        controller.close();
        return;
      }

      let holdings: UnifiedPortfolio[];
      try {
        const cleaned = fullText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const jsonStart = cleaned.indexOf('[');
        const jsonEnd = cleaned.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON array found');
        holdings = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as UnifiedPortfolio[];
        if (!Array.isArray(holdings)) throw new Error('Not an array');
      } catch {
        send({ type: 'error', message: 'Could not extract holdings. Try adding a description.' });
        controller.close();
        return;
      }

      if (holdings.length === 0) {
        send({ type: 'done', count: 0, message: 'No holdings found' });
        controller.close();
        return;
      }

      const effectiveSource = portfolioName || holdings[0]?.source || 'Unknown';

      if (replaceSource) {
        await supabase
          .from('holdings')
          .delete()
          .eq('user_id', userId)
          .eq('source', replaceSource);
      }

      const rows = holdings.map((item) => ({
        user_id: userId,
        asset_id: item.asset_id,
        source: effectiveSource,
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
        send({ type: 'error', message: `Failed to save: ${error.message}` });
      } else {
        send({ type: 'done', count: data.length, source: holdings[0]?.source ?? 'Unknown' });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
