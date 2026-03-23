import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { maskPII } from '@/lib/pii-masker';
import { toDecimal, formatCurrency, Decimal } from '@/lib/decimal';
import { enrichHoldings, buildMarketContext, fetchBenchmarks } from '@/lib/market-data';
import { renderResearchPDF } from '@/lib/pdf/render';
import { sendMail } from '@/lib/mailer';
import { render } from '@react-email/components';
import BriefingEmail from '@/emails/briefing-email';
import type { HoldingRow, SnapshotBreakdown, Source, AssetClass } from '@/lib/types';

const CRON_SECRET = process.env.CRON_SECRET;

const BRIEFING_SYSTEM = `You are a private wealth advisor writing a concise daily briefing for an ultra-high-net-worth individual. Write in a professional but conversational tone.

FORMATTING RULES (strict):
- Write in PLAIN TEXT only. No markdown, no asterisks, no hashtags, no tables, no horizontal rules.
- Do NOT use emojis or symbols like 🔴 🟡 ⚠️. Use words instead.
- Use simple section headers on their own line like "PORTFOLIO SUMMARY" or "KEY MOVERS".
- Use plain dashes for lists. Keep formatting minimal and email-friendly.
- Numbers should use proper currency formatting with currency label (e.g. A$4,433,235 or US$1,250,000).

BASE CURRENCY AND UNITS (strict):
- BASE CURRENCY: AUD (Australian Dollar). ALL portfolio totals, breakdowns, and aggregated values MUST be reported in AUD. Prefix AUD values with "A$".
- When referencing non-AUD prices, always show both the original currency AND the AUD equivalent. Example: "US$248.00 (A$359.42 at 0.6900)".
- COMMODITY UNITS: Gold (GC=F) and Silver (SI=F) prices are per troy ounce. Oil (CL=F, BZ=F) prices are per barrel. Always state the unit.
- FX RATES: Use ONLY the exact rates from the "GLOBAL BENCHMARKS" section. Do NOT estimate or assume exchange rates.
- CRYPTO: Bitcoin (BTC) and Ethereum (ETH) are quoted in USD. Convert to AUD using the AUD/USD rate provided.

ACCURACY REQUIREMENTS:
- Every number you report MUST come directly from the data provided. Never estimate or hallucinate prices.
- For every calculated value, briefly show your formula. Example: "AAPL: 2,000 units x US$248.00 = US$496,000 / 0.6900 = A$718,841".
- Do NOT invent quantities, prices, or exchange rates. If a value is not in the data, say "not available".
- If a holding has no live price or no quantity, use the base valuation provided and note it as "last reported value (not live)".
- If data is missing or stale, say so explicitly. Never fill gaps with assumptions.
- When calculating daily change impact on a holding, use: base_valuation x day_change_pct. Show this calculation.

CRITICAL — TOTAL VALUE vs PER-UNIT PRICE:
- Each holding's "Total Value" is the TOTAL position value (already quantity × price). Use it directly.
- Each holding's "Live Total" (if present) is the up-to-date total position value (quantity × current market price). Use it in preference to Total Value.
- NEVER re-multiply quantity × benchmark price to compute a holding's value. The totals are pre-calculated and authoritative.
- For commodities (gold, silver, oil): the Total Value already accounts for the number of ounces/barrels. Do NOT multiply again by the benchmark price — this causes double-counting.
- Example: If gold shows "Qty: 50 | Total Value: $115,000 | Live Total: $117,500", report the Live Total ($117,500). Do NOT compute 50 × gold benchmark price separately.

Structure your response with these sections:

PORTFOLIO SUMMARY
Total value in AUD, daily change amount and percentage. State the AUD/USD rate used.

KEY MOVERS
Top 3-5 holdings that drove the change, with context on WHY they moved. Show calculations.

MARKET CONTEXT
Gold (per troy oz), oil (per barrel), crypto, FX, and index movements that matter to this portfolio.

RISK FLAGS
Concentration risks, unusual movements, currency exposure, items to watch.

RECOMMENDATION
One or two actionable suggestions.

Keep it under 500 words. Do not include any PII.`;

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

function getAustralianEasternParts(): { hour: number; dayName: string } {
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = parseInt(get('hour'), 10);
  const dayName = get('weekday').toLowerCase().slice(0, 3);
  return { hour, dayName };
}

function getCurrentAESTHour(): string {
  const { hour } = getAustralianEasternParts();
  return `${String(hour).padStart(2, '0')}:00`;
}

function getCurrentAESTDay(): string {
  const { dayName } = getAustralianEasternParts();
  return dayName;
}

// Support both GET (external cron services) and POST (Vercel cron)
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, serviceKey);

  const currentAEST = getCurrentAESTHour();
  const currentDay = getCurrentAESTDay();

  const { data: allSettings, error: settingsErr } = await supabase
    .from('user_settings')
    .select('*')
    .eq('email_enabled', true)
    .eq('email_time', currentAEST);

  if (settingsErr || !allSettings?.length) {
    return NextResponse.json({
      message: `No users scheduled for ${currentAEST} AEST`,
      currentAEST,
      processed: 0,
    });
  }

  const settings = allSettings.filter((s) => {
    const days = (s.email_days || 'mon,tue,wed,thu,fri').split(',').map((d: string) => d.trim());
    return days.includes(currentDay);
  });

  if (!settings.length) {
    return NextResponse.json({
      message: `No users scheduled for ${currentDay} ${currentAEST} AEST`,
      currentAEST,
      currentDay,
      processed: 0,
    });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: 'SMTP not configured. Set SMTP_USER and SMTP_PASS.' },
      { status: 500 },
    );
  }

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
        // Prefer FX-converted AUD value, fall back to raw live value, then base valuation
        const val = toDecimal(e.live_value_aud ?? e.live_value ?? h.valuation_base);
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

      // --- Build portfolio context with live market data + benchmarks ---
      const marketContext = buildMarketContext(enriched);
      const benchmarkContext = await fetchBenchmarks(userSettings.watch_items || '');

      const holdingLines = holdings.map((h) => {
        const e = enriched.find((x) => x.asset_id === h.asset_id);
        const qty = h.quantity != null ? ` | Qty: ${h.quantity}` : '';
        const ccy = h.currency && h.currency !== 'AUD' ? ` (${h.currency})` : '';
        const liveCcy = e?.price_currency && e.price_currency !== 'AUD' ? ` ${e.price_currency}` : '';
        const live = e?.live_value != null ? ` | Live Total: ${formatCurrency(e.live_value)}${liveCcy}` : '';
        const liveAud = e?.live_value_aud != null && e?.price_currency && e.price_currency !== 'AUD'
          ? ` (A$${e.live_value_aud.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ fx ${e.fx_rate_to_aud?.toFixed(4)})`
          : '';
        return `  ${h.asset_name} | Source: ${h.source} | Class: ${h.asset_class} | Total Value: ${formatCurrency(h.valuation_base)}${ccy}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}${qty}${live}${liveAud}`;
      });

      const portfolioContext = `
BASE CURRENCY: AUD (Australian Dollar). All totals are in AUD.

CURRENT PORTFOLIO (${today}):
Total Value (AUD): ${formatCurrency(totalValue.toNumber())}
${deltaValue != null ? `Daily Change: ${formatCurrency(deltaValue)} (${deltaPct?.toFixed(2)}%)` : 'No previous snapshot for comparison.'}

BREAKDOWN BY SOURCE (AUD):
${Object.entries(breakdown.by_source).map(([s, v]) => `  ${s}: ${formatCurrency(v)}`).join('\n')}

BREAKDOWN BY ASSET CLASS (AUD):
${Object.entries(breakdown.by_class).map(([c, v]) => `  ${c}: ${formatCurrency(v)}`).join('\n')}

HOLDINGS (NOTE: "Total Value" and "Live Total" below are TOTAL position values, not per-unit prices. Use them directly — do NOT re-multiply quantity × price):
${holdingLines.join('\n')}
${marketContext}
${benchmarkContext}
`;

      const maskedContext = maskPII(portfolioContext);
      const customInstructions = [
        userSettings.custom_instructions,
        userSettings.watch_items ? `WATCH LIST (always cover these): ${userSettings.watch_items}` : '',
        userSettings.focus_areas ? `FOCUS AREAS (prioritize analysis on): ${userSettings.focus_areas}` : '',
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

      // --- Generate research PDF (if enabled and scheduled for today) ---
      let pdfBuffer: Buffer | null = null;
      const pdfDaysList = (userSettings.pdf_days || '').split(',').map((d: string) => d.trim()).filter(Boolean);
      const shouldAttachPdf = userSettings.include_pdf &&
        (pdfDaysList.length === 0 || pdfDaysList.includes(currentDay));

      if (shouldAttachPdf) {
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

      // --- Send email via SMTP ---
      const html = await render(
        BriefingEmail({ briefingDate: today, content: summaryText }),
      );

      await sendMail({
        to: userEmail,
        subject: `WealthDelta Daily Briefing — ${today}`,
        html,
        attachments: pdfBuffer
          ? [{ filename: `WealthDelta-Research-${today}.pdf`, content: pdfBuffer }]
          : undefined,
      });
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
    message: `Processed ${results.length} users for ${currentAEST} AEST`,
    currentAEST,
    date: today,
    results,
  });
}
