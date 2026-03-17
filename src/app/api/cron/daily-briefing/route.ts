import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { maskPII } from '@/lib/pii-masker';
import { toDecimal, formatCurrency, Decimal } from '@/lib/decimal';
import { enrichHoldings, buildMarketContext } from '@/lib/market-data';
import { renderResearchPDF } from '@/lib/pdf/render';
import { Resend } from 'resend';
import BriefingEmail from '@/emails/briefing-email';
import type { HoldingRow, SnapshotBreakdown, Source, AssetClass } from '@/lib/types';

const CRON_SECRET = process.env.CRON_SECRET;

const BRIEFING_SYSTEM = `You are a private wealth advisor writing a concise daily briefing for an ultra-high-net-worth individual. Write in a professional but conversational tone. Structure your response with:

1. **Portfolio Summary** — Total value, daily change (amount and percentage)
2. **Key Movers** — Top 3-5 holdings that drove the change, with context
3. **Market Context** — Relevant macro events that impacted the portfolio
4. **Risk Flags** — Any concentration risks, unusual movements, or items to watch
5. **Recommendation** — One or two actionable suggestions

Keep it under 500 words. Use proper currency formatting. Do not include any PII.`;

const RESEARCH_SYSTEM = `You are a senior wealth research analyst producing a comprehensive portfolio research report. Write with the authority of a Goldman Sachs or UBS research report.

Structure with these sections:
# Executive Summary
# Portfolio Overview
# Market Context
# Position Analysis
# Risk Assessment
# Recommendations
# Appendix

Write approximately 2000-3000 words. Use professional financial language.`;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, serviceKey);

  const { data: settings, error: settingsErr } = await supabase
    .from('user_settings')
    .select('*')
    .eq('email_enabled', true);

  if (settingsErr || !settings?.length) {
    return NextResponse.json({
      message: 'No users with email enabled',
      processed: 0,
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || resendKey === 're_xxxxx') {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 },
    );
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.BRIEFING_FROM_EMAIL ?? 'briefing@wealthdelta.app';
  const today = new Date().toISOString().split('T')[0];
  const results: Array<{ userId: string; status: string; error?: string }> = [];

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  for (const userSettings of settings) {
    const userId = userSettings.user_id;

    try {
      const { data: user } = await supabase.auth.admin.getUserById(userId);
      const userEmail = user?.user?.email;
      if (!userEmail) {
        results.push({ userId, status: 'skipped', error: 'No email' });
        continue;
      }

      const { data: holdings } = await supabase
        .from('holdings')
        .select('*')
        .eq('user_id', userId) as { data: HoldingRow[] | null };

      if (!holdings?.length) {
        results.push({ userId, status: 'skipped', error: 'No holdings' });
        continue;
      }

      // --- Enrich with live prices and generate snapshot ---
      const enriched = await enrichHoldings(holdings);

      let totalValue = toDecimal(0);
      const bySource: Record<string, Decimal> = {};
      const byClass: Record<string, Decimal> = {};

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
        .select('total_value')
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

      // --- Build portfolio context with live market data ---
      const marketContext = buildMarketContext(enriched);
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
  return `  ${h.asset_name} (${h.source}, ${h.asset_class}): ${formatCurrency(h.valuation_base)}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}${qty}${live}`;
}).join('\n')}
${marketContext}
`;

      const maskedContext = maskPII(portfolioContext);
      const customInstructions = [
        userSettings.custom_instructions,
        userSettings.watch_items ? `WATCH: ${userSettings.watch_items}` : '',
      ].filter(Boolean).join('\n');

      // --- Generate executive summary ---
      const briefingPrompt = customInstructions
        ? `${BRIEFING_SYSTEM}\n\nADDITIONAL INSTRUCTIONS:\n${customInstructions}`
        : BRIEFING_SYSTEM;

      const briefingMsg = await anthropic.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 2048,
        system: briefingPrompt,
        messages: [
          { role: 'user', content: `Generate today's wealth briefing:\n\n${maskedContext}` },
        ],
      });

      const summaryText = briefingMsg.content
        .filter((b) => b.type === 'text')
        .map((b) => ('text' in b ? b.text : ''))
        .join('');

      await supabase.from('briefings').upsert(
        {
          user_id: userId,
          briefing_date: today,
          summary_text: summaryText,
          prompt_tokens: briefingMsg.usage.input_tokens,
          completion_tokens: briefingMsg.usage.output_tokens,
          model: ANTHROPIC_MODEL,
          custom_instructions: customInstructions || null,
        },
        { onConflict: 'user_id,briefing_date' },
      );

      // --- Generate research PDF (if enabled) ---
      let pdfBuffer: Buffer | null = null;

      if (userSettings.include_pdf) {
        const researchMsg = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 8192,
          system: RESEARCH_SYSTEM,
          messages: [
            { role: 'user', content: `Generate a comprehensive research report:\n\n${maskedContext}` },
          ],
        });

        const reportText = researchMsg.content
          .filter((b) => b.type === 'text')
          .map((b) => ('text' in b ? b.text : ''))
          .join('');

        pdfBuffer = await renderResearchPDF(reportText, today);
      }

      // --- Send email ---
      const emailPayload: Parameters<typeof resend.emails.send>[0] = {
        from: fromEmail,
        to: userEmail,
        subject: `WealthDelta Daily Briefing — ${today}`,
        react: BriefingEmail({ briefingDate: today, content: summaryText }),
      };

      if (pdfBuffer) {
        emailPayload.attachments = [
          {
            filename: `WealthDelta-Research-${today}.pdf`,
            content: pdfBuffer,
          },
        ];
      }

      await resend.emails.send(emailPayload);
      results.push({ userId, status: 'sent' });
    } catch (err) {
      results.push({
        userId,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    message: `Processed ${results.length} users`,
    date: today,
    results,
  });
}
