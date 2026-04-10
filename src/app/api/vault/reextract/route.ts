import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractHoldingsFromBuffer } from '@/lib/extract-holdings';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const maxDuration = 300;

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = userData.user.id;

  const rateCheck = checkRateLimit(`reextract:${userId}`, RATE_LIMITS.reextract);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many re-extraction requests. Please try again later.' },
      { status: 429 },
    );
  }

  const { data: vaultFiles, error: vfErr } = await supabase
    .from('vault_files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (vfErr || !vaultFiles?.length) {
    return NextResponse.json(
      { error: 'No stored files found. Upload new statements first — they will be stored for future re-extraction.' },
      { status: 404 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      let totalHoldings = 0;
      let filesProcessed = 0;

      for (let i = 0; i < vaultFiles.length; i++) {
        const vf = vaultFiles[i];
        send({ type: 'progress', file: vf.file_name, source: vf.source, index: i, total: vaultFiles.length, status: 'downloading' });

        try {
          // Download file from storage
          const { data: fileData, error: dlErr } = await supabase.storage
            .from('vault-files')
            .download(vf.file_path);

          if (dlErr || !fileData) {
            send({ type: 'progress', file: vf.file_name, source: vf.source, index: i, total: vaultFiles.length, status: 'error', message: `Download failed: ${dlErr?.message ?? 'No data'}` });
            continue;
          }

          send({ type: 'progress', file: vf.file_name, source: vf.source, index: i, total: vaultFiles.length, status: 'extracting' });

          const buffer = await fileData.arrayBuffer();
          const result = await extractHoldingsFromBuffer({
            buffer,
            fileName: vf.file_name,
            mimeType: vf.mime_type ?? 'application/pdf',
            portfolioName: vf.source,
            description: vf.description ?? undefined,
          });

          if (result.holdings.length === 0) {
            send({ type: 'progress', file: vf.file_name, source: vf.source, index: i, total: vaultFiles.length, status: 'error', message: 'No holdings extracted' });
            continue;
          }

          // Delete existing holdings for this source, then insert fresh
          await supabase
            .from('holdings')
            .delete()
            .eq('user_id', userId)
            .eq('source', vf.source);

          const rows = result.holdings.map((item) => ({
            user_id: userId,
            asset_id: item.asset_id,
            source: vf.source,
            asset_name: item.asset_name,
            asset_class: item.asset_class,
            ticker_symbol: item.ticker_symbol,
            quantity: item.quantity,
            valuation_base: item.valuation_base,
            valuation_date: item.valuation_date,
            currency: item.currency,
            is_static: true,
          }));

          const { data: inserted, error: upsertErr } = await supabase
            .from('holdings')
            .upsert(rows, { onConflict: 'user_id,asset_id' })
            .select();

          if (upsertErr) {
            send({ type: 'progress', file: vf.file_name, source: vf.source, index: i, total: vaultFiles.length, status: 'error', message: upsertErr.message });
            continue;
          }

          const count = inserted?.length ?? 0;
          totalHoldings += count;
          filesProcessed++;

          // Update vault_files with extraction result
          await supabase
            .from('vault_files')
            .update({
              holdings_extracted: count,
              last_extracted_at: new Date().toISOString(),
            })
            .eq('id', vf.id);

          send({
            type: 'progress',
            file: vf.file_name,
            source: vf.source,
            index: i,
            total: vaultFiles.length,
            status: 'done',
            count,
            warnings: result.warnings.length > 0 ? result.warnings.slice(0, 5) : undefined,
          });
        } catch (err) {
          send({
            type: 'progress',
            file: vf.file_name,
            source: vf.source,
            index: i,
            total: vaultFiles.length,
            status: 'error',
            message: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      send({ type: 'complete', total_holdings: totalHoldings, files_processed: filesProcessed, total_files: vaultFiles.length });
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
