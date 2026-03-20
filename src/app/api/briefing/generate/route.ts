import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { maskPII } from '@/lib/pii-masker';
import { toDecimal, formatCurrency } from '@/lib/decimal';
import { enrichHoldings, buildMarketContext, fetchBenchmarks } from '@/lib/market-data';
import type { HoldingRow, SnapshotBreakdown, Source, AssetClass } from '@/lib/types';

const BRIEFING_SYSTEM = `You are a private wealth advisor writing a concise daily briefing for an ultra-high-net-worth individual. Write in a professional but conversational tone.

CRITICAL — ACCURACY REQUIREMENTS:
- Every number you report MUST come directly from the data provided. Never estimate or hallucinate prices.
- For commodities (gold, silver, oil), use the exact benchmark prices provided under "GLOBAL BENCHMARKS".
- For crypto (BTC, ETH), use the exact prices provided. Report in USD.
- For currencies/FX pairs, use the exact rates provided. State the direction clearly.
- For equities, use the live prices from "LIVE MARKET DATA". If a holding has no live price, state the last known valuation and flag it as stale.
- When calculating portfolio impact, show your math briefly.
- If data is missing or stale, say so explicitly. Never fill gaps with assumptions.

Structure your response with:
1. **Portfolio Summary** — Total value, daily change (amount and percentage)
2. **Key Movers** — Top 3-5 holdings that drove the change, with context on WHY they moved
3. **Market Context** — Gold, oil, crypto, FX, and index movements that matter to this portfolio
4. **Risk Flags** — Concentration risks, unusual movements, currency exposure, items to watch
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

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('custom_instructions, watch_items, focus_areas')
    .eq('user_id', userId)
    .single();

  const customInstructions = [
    body.customInstructions || userSettings?.custom_instructions || '',
    userSettings?.watch_items ? `WATCH LIST (always cover these): ${userSettings.watch_items}` : '',
    userSettings?.focus_areas ? `FOCUS AREAS (prioritize analysis on): ${userSettings.focus_areas}` : '',
  ].filter(Boolean).join('\n');

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null };

  if (!holdings?.length) {
    return NextResponse.json(
      { error: 'No data available', details: 'Upload holdings first' },
      { status: 404 },
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const enriched = await enrichHoldings(holdings);

  let totalValue = toDecimal(0);
  const bySource: Record<string, ReturnType<typeof toDecimal>> = {};
  const byClass: Record<string, ReturnType<typeof toDecimal>> = {};

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const val = toDecimal(e.live_value ?? h.valuation_base);
    totalValue = totalValue.plus(val);
    bySource[h.source] = (bySource[h.source] ?? toDecimal(0)).plus(val);
    byClass[h.asset_class] = (byClass[h.asset_class] ?? toDecimal(0)).plus(val);
  }

  const breakdown: SnapshotBreakdown = {
    by_source: Object.fromEntries(
      Object.entries(bySource).map(([k, v]) => [k, v.toNumber()]),
    ) as Record<Source, number>,
    by_class: Object.fromEntries(
      Object.entries(byClass).map(([k, v]) => [k, v.toNumber()]),
    ) as Record<AssetClass, number>,
  };

  const { data: prevSnapshot } = await supabase
    .from('daily_snapshots')
    .select('total_value, snapshot_date')
    .eq('user_id', userId)
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  let deltaValue: number | null = null;
  let deltaPct: number | null = null;

  if (prevSnapshot) {
    const prevVal = toDecimal(prevSnapshot.total_value);
    deltaValue = totalValue.minus(prevVal).toNumber();
    deltaPct = prevVal.isZero()
      ? null
      : totalValue.minus(prevVal).div(prevVal).times(100).toDecimalPlaces(4).toNumber();
  }

  await supabase.from('daily_snapshots').upsert(
    {
      user_id: userId,
      snapshot_date: today,
      total_value: totalValue.toNumber(),
      delta_value: deltaValue,
      delta_pct: deltaPct,
      breakdown_json: breakdown,
    },
    { onConflict: 'user_id,snapshot_date' },
  );

  const marketContext = buildMarketContext(enriched);
  const benchmarkContext = await fetchBenchmarks(userSettings?.watch_items || '');

  const portfolioContext = `
CURRENT PORTFOLIO (${today}):
Total Value: ${formatCurrency(totalValue.toNumber())}
${deltaValue != null ? `Daily Change: ${formatCurrency(deltaValue)} (${deltaPct?.toFixed(2)}%)` : 'No previous snapshot for comparison.'}

BREAKDOWN BY SOURCE:
${Object.entries(breakdown.by_source).map(([s, v]) => `  ${s}: ${formatCurrency(v)}`).join('\n')}

BREAKDOWN BY ASSET CLASS:
${Object.entries(breakdown.by_class).map(([c, v]) => `  ${c}: ${formatCurrency(v)}`).join('\n')}

HOLDINGS:
${holdings.map((h) => {
  const e = enriched.find((x) => x.asset_id === h.asset_id);
  const qty = h.quantity != null ? ` | ${h.quantity} units` : '';
  const live = e?.live_value != null ? ` | Live: ${formatCurrency(e.live_value)}` : '';
  const ccy = h.currency && h.currency !== 'AUD' ? ` (${h.currency})` : '';
  return `  ${h.asset_name} (${h.source}, ${h.asset_class}): ${formatCurrency(h.valuation_base)}${ccy}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}${qty}${live}`;
}).join('\n')}
${marketContext}
${benchmarkContext}
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
    max_tokens: 4096,
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
