import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { maskPII } from '@/lib/pii-masker';
import { formatCurrency } from '@/lib/decimal';
import { enrichHoldings, buildMarketContext } from '@/lib/market-data';
import type { HoldingRow, DailySnapshotRow } from '@/lib/types';

const BRIEFING_SYSTEM = `You are a private wealth advisor writing a concise daily briefing for an ultra-high-net-worth individual. Write in a professional but conversational tone. Structure your response with:

1. **Portfolio Summary** — Total value, daily change (amount and percentage)
2. **Key Movers** — Top 3-5 holdings that drove the change, with context
3. **Market Context** — Relevant macro events that impacted the portfolio
4. **Risk Flags** — Any concentration risks, unusual movements, or items to watch
5. **Recommendation** — One or two actionable suggestions

Keep it under 500 words. Use proper currency formatting. Do not include any PII.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = userData.user.id;
  const body = (await request.json()) as { customInstructions?: string };
  const customInstructions = body.customInstructions ?? '';

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null };

  const { data: snapshots } = await supabase
    .from('daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(2) as { data: DailySnapshotRow[] | null };

  if (!holdings?.length || !snapshots?.length) {
    return NextResponse.json(
      { error: 'No data available', details: 'Generate a snapshot first' },
      { status: 404 },
    );
  }

  const currentSnapshot = snapshots[0];
  const prevSnapshot = snapshots[1] ?? null;

  const enriched = await enrichHoldings(holdings);
  const marketContext = buildMarketContext(enriched);

  const portfolioContext = `
CURRENT PORTFOLIO (${currentSnapshot.snapshot_date}):
Total Value: ${formatCurrency(currentSnapshot.total_value)}
${currentSnapshot.delta_value != null ? `Daily Change: ${formatCurrency(currentSnapshot.delta_value)} (${currentSnapshot.delta_pct?.toFixed(2)}%)` : 'No previous snapshot for comparison.'}

BREAKDOWN BY SOURCE:
${currentSnapshot.breakdown_json ? Object.entries(currentSnapshot.breakdown_json.by_source).map(([s, v]) => `  ${s}: ${formatCurrency(v as number)}`).join('\n') : 'N/A'}

BREAKDOWN BY ASSET CLASS:
${currentSnapshot.breakdown_json ? Object.entries(currentSnapshot.breakdown_json.by_class).map(([c, v]) => `  ${c}: ${formatCurrency(v as number)}`).join('\n') : 'N/A'}

HOLDINGS:
${holdings.map((h) => {
  const e = enriched.find((x) => x.asset_id === h.asset_id);
  const qty = h.quantity != null ? ` | ${h.quantity} units` : '';
  const live = e?.live_value != null ? ` | Live: ${formatCurrency(e.live_value)}` : '';
  return `  ${h.asset_name} (${h.source}, ${h.asset_class}): ${formatCurrency(h.valuation_base)}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}${qty}${live}`;
}).join('\n')}
${marketContext}
${prevSnapshot ? `\nPREVIOUS SNAPSHOT (${prevSnapshot.snapshot_date}):\nTotal: ${formatCurrency(prevSnapshot.total_value)}` : ''}
`;

  const maskedContext = maskPII(portfolioContext);

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return NextResponse.json(
      { error: 'AI not configured', details: err instanceof Error ? err.message : 'Set ANTHROPIC_API_KEY' },
      { status: 500 },
    );
  }

  const systemPrompt = customInstructions
    ? `${BRIEFING_SYSTEM}\n\nADDITIONAL INSTRUCTIONS FROM USER:\n${customInstructions}`
    : BRIEFING_SYSTEM;

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate today's wealth briefing based on this portfolio data:\n\n${maskedContext}`,
      },
    ],
  });

  const summaryText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  const today = new Date().toISOString().split('T')[0];

  const { data: briefing, error: bErr } = await supabase
    .from('briefings')
    .upsert(
      {
        user_id: userId,
        briefing_date: today,
        summary_text: summaryText,
        prompt_tokens: message.usage.input_tokens,
        completion_tokens: message.usage.output_tokens,
        model: ANTHROPIC_MODEL,
        custom_instructions: customInstructions || null,
      },
      { onConflict: 'user_id,briefing_date' },
    )
    .select()
    .single();

  if (bErr) {
    return NextResponse.json(
      { error: 'Failed to save briefing', details: bErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: 'Briefing generated',
    briefing,
  });
}
