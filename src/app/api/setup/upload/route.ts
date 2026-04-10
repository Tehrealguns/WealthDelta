import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { validateAndNormalizeHoldings } from '@/lib/holdings-validation';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { isPdf, isImage, EXTRACTION_PROMPT } from '@/lib/extract-holdings';

export const maxDuration = 300;

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

  const rateCheck = checkRateLimit(`upload:${userData.user.id}`, RATE_LIMITS.upload);
  if (!rateCheck.allowed) {
    return new Response(
      sseEvent({ type: 'error', message: 'Too many upload requests. Please try again later.' }),
      { status: 429, headers: { 'Content-Type': 'text/event-stream', 'Retry-After': String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } },
    );
  }

  if (!file || file.size === 0) {
    return new Response(sseEvent({ type: 'error', message: 'No file uploaded' }), {
      status: 400,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
  if (file.size > MAX_FILE_SIZE) {
    return new Response(sseEvent({ type: 'error', message: 'File too large. Maximum size is 50 MB.' }), {
      status: 413,
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

  const contextParts = [EXTRACTION_PROMPT];
  if (fileDescription) contextParts.push(`\nUSER DESCRIPTION: ${fileDescription}`);
  if (portfolioName) contextParts.push(`\nPORTFOLIO/SOURCE NAME: ${portfolioName}`);
  const fullPrompt = contextParts.join('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBlocks: any[] = [];
  let fileBytes: ArrayBuffer;

  try {
    fileBytes = await file.arrayBuffer();
    const bytes = fileBytes;
    const base64 = Buffer.from(bytes).toString('base64');

    if (isPdf(file.type) || isPdf(file.name)) {
      contentBlocks.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: base64 },
      });
    } else if (isImage(file.type) || isImage(file.name)) {
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

      let rawHoldings: unknown[];
      try {
        const cleaned = fullText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        const jsonStart = cleaned.indexOf('[');
        const jsonEnd = cleaned.lastIndexOf(']');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON array found');
        rawHoldings = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as unknown[];
        if (!Array.isArray(rawHoldings)) throw new Error('Not an array');
      } catch {
        send({ type: 'error', message: 'Could not extract holdings. Try adding a description.' });
        controller.close();
        return;
      }

      const effectiveSource = portfolioName?.trim().slice(0, 200) || undefined;
      const { valid: holdings, warnings, dropped } = validateAndNormalizeHoldings(rawHoldings, effectiveSource);

      if (warnings.length > 0) {
        console.log(`[upload] Validation warnings: ${warnings.join('; ')}`);
      }
      if (dropped > 0) {
        console.log(`[upload] Dropped ${dropped} invalid holdings`);
      }

      if (holdings.length === 0) {
        send({ type: 'done', count: 0, message: 'No valid holdings found' });
        controller.close();
        return;
      }

      // Use validated source, fall back to first holding's source
      const finalSource = effectiveSource || holdings[0]?.source || 'Unknown';

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
        source: finalSource,
        asset_name: item.asset_name,
        asset_class: item.asset_class,
        ticker_symbol: item.ticker_symbol,
        quantity: item.quantity,
        valuation_base: item.valuation_base,
        valuation_date: item.valuation_date,
        currency: item.currency,
        is_static: true,
      }));

      const { data, error } = await supabase
        .from('holdings')
        .upsert(rows, { onConflict: 'user_id,asset_id' })
        .select();

      if (error) {
        send({ type: 'error', message: `Failed to save: ${error.message}` });
        controller.close();
        return;
      }

      send({ type: 'done', count: data.length, source: finalSource });

      // Store file for future re-extraction (non-blocking)
      try {
        const fileExt = (fileName ?? file.name).split('.').pop() ?? 'pdf';
        const storagePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

        await supabase.storage
          .from('vault-files')
          .upload(storagePath, new Uint8Array(fileBytes), {
            contentType: file.type || 'application/pdf',
            upsert: false,
          });

        await supabase.from('vault_files').insert({
          user_id: userId,
          source: finalSource,
          file_name: fileName ?? file.name,
          file_path: storagePath,
          file_size: file.size,
          mime_type: file.type || null,
          description: fileDescription || null,
          holdings_extracted: data.length,
          last_extracted_at: new Date().toISOString(),
        });
      } catch (storageErr) {
        console.error('[upload] Failed to store file for re-extraction:', storageErr instanceof Error ? storageErr.message : storageErr);
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
