/**
 * Diagnostic: generate a briefing and trace every value through the pipeline.
 *
 * Pulls holdings from Supabase for a real user, runs enrichment + PII masking,
 * prints what the AI actually sees, generates the briefing, then asks the AI
 * to explain where each number came from.
 *
 * Usage:
 *   npx tsx scripts/test-briefing-diagnostic.ts
 *
 * Env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: true });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import Decimal from 'decimal.js';
import { enrichHoldings, buildMarketContext, fetchBenchmarks, getQuote } from '../src/lib/market-data';
import { maskPII } from '../src/lib/pii-masker';
import type { HoldingRow } from '../src/lib/types';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

function toDecimal(v: number | string) { return new Decimal(v); }
function formatCurrency(v: number | string | Decimal, ccy = 'AUD') {
  const num = new Decimal(v).toNumber();
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: ccy,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(num);
}

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!ANTHROPIC_KEY || ANTHROPIC_KEY === 'sk-ant-xxxxx') {
  console.error('Missing or placeholder ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// ── The same system prompt used in production ───────────────────────────────
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

async function main() {
  const sep = '='.repeat(80);

  // ── 1. Get first user with holdings ───────────────────────────────────────
  console.log(sep);
  console.log('STEP 1: Fetching a user with holdings');
  console.log(sep);

  // Accept email or user_id as CLI arg, otherwise use first user with holdings
  const arg = process.argv[2];
  let userId: string;

  if (arg?.includes('@')) {
    const { data } = await supabase.auth.admin.listUsers();
    const user = data.users.find((u) => u.email === arg);
    if (!user) { console.error(`No user found with email: ${arg}`); process.exit(1); }
    userId = user.id;
    console.log(`Found user by email: ${arg} -> ${userId}\n`);
  } else if (arg) {
    userId = arg;
    console.log(`Using provided user_id: ${userId}\n`);
  } else {
    const { data: sampleHolding } = await supabase
      .from('holdings')
      .select('user_id')
      .limit(1)
      .single();
    if (!sampleHolding) { console.error('No holdings found in the database.'); process.exit(1); }
    userId = sampleHolding.user_id;
    console.log(`Using first user with holdings: ${userId}\n`);
  }

  // ── 2. Fetch holdings ─────────────────────────────────────────────────────
  console.log(sep);
  console.log('STEP 2: Raw holdings from Supabase');
  console.log(sep);

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null };

  if (!holdings?.length) {
    console.error('No holdings for this user.');
    process.exit(1);
  }

  console.log(`Found ${holdings.length} holdings:\n`);
  for (const h of holdings) {
    console.log(`  ${h.asset_name} | class=${h.asset_class} | source=${h.source} | ticker=${h.ticker_symbol || 'NONE'}`);
    console.log(`    valuation_base=${h.valuation_base} | quantity=${h.quantity} | currency=${h.currency}`);
  }

  // ── 3. Fetch FX rates ─────────────────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 3: FX rates (for AUD conversion)');
  console.log(sep);

  const audUsdQuote = await getQuote('AUDUSD=X');
  const audUsd = audUsdQuote?.price;
  console.log(`  AUD/USD rate: ${audUsd?.toFixed(6) ?? 'N/A'}`);
  if (audUsd) {
    console.log(`  1 USD = ${(1 / audUsd).toFixed(6)} AUD`);
  }

  // ── 4. Enrich with live market data ───────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 4: Enriched holdings (after market data + FX conversion)');
  console.log(sep);

  const enriched = await enrichHoldings(holdings);

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];

    console.log(`\n  ${h.asset_name} (${h.ticker_symbol || 'no ticker'}):`);
    console.log(`    DB valuation_base : ${h.currency} ${h.valuation_base}`);
    console.log(`    Live price        : ${e.live_price != null ? `${e.price_currency} ${e.live_price}` : 'NULL'}`);
    console.log(`    Quantity          : ${h.quantity ?? 'NULL'}`);
    console.log(`    Live value (native): ${e.live_value != null ? `${e.price_currency} ${e.live_value.toFixed(2)}` : 'NULL'}`);
    console.log(`    Live value (AUD)  : ${e.live_value_aud != null ? `AUD ${e.live_value_aud.toFixed(2)}` : 'NULL'}`);
    console.log(`    FX rate to AUD    : ${e.fx_rate_to_aud?.toFixed(6) ?? 'N/A'}`);
    console.log(`    Stale?            : ${e.stale}`);
    console.log(`    Day change        : ${e.day_change ?? 'NULL'} (${e.day_change_pct ?? 'NULL'}%)`);

    // Flag large divergences
    if (e.live_value_aud != null) {
      const diff = Math.abs(e.live_value_aud - h.valuation_base);
      const pctDiff = (diff / h.valuation_base) * 100;
      if (pctDiff > 10) {
        console.log(`    *** WARNING: AUD live value differs from base by ${pctDiff.toFixed(1)}% ***`);
      }
    }
  }

  // ── 5. Build totals (using AUD-converted values) ──────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 5: Portfolio totals (AUD)');
  console.log(sep);

  let totalValue = toDecimal(0);
  const bySource: Record<string, Decimal> = {};
  const byClass: Record<string, Decimal> = {};
  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const val = toDecimal(e.live_value_aud ?? h.valuation_base);
    totalValue = totalValue.plus(val);
    bySource[h.source] = (bySource[h.source] ?? toDecimal(0)).plus(val);
    byClass[h.asset_class] = (byClass[h.asset_class] ?? toDecimal(0)).plus(val);
  }

  console.log(`Total portfolio value (AUD): ${formatCurrency(totalValue.toNumber())}`);

  const today = new Date().toISOString().split('T')[0];
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
    console.log(`Previous snapshot (${prevSnapshot.snapshot_date}): ${formatCurrency(prevSnapshot.total_value)}`);
    console.log(`Delta: ${formatCurrency(deltaValue!)} (${deltaPct?.toFixed(2)}%)`);
  } else {
    console.log('No previous snapshot found.');
  }

  // ── 6. Build the context string (exactly as production does) ──────────────
  console.log(`\n${sep}`);
  console.log('STEP 6: Context string BEFORE PII masking');
  console.log(sep);

  const breakdown = {
    by_source: Object.fromEntries(Object.entries(bySource).map(([k, v]) => [k, v.toNumber()])),
    by_class: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, v.toNumber()])),
  };

  const marketContext = buildMarketContext(enriched);
  const benchmarkContext = await fetchBenchmarks();

  const holdingLines = holdings.map((h) => {
    const e = enriched.find((x) => x.asset_id === h.asset_id);
    const qty = h.quantity != null ? ` | ${h.quantity} units` : ' | quantity: N/A';
    const ccy = h.currency || 'AUD';
    let liveInfo = '';
    if (e?.live_price != null) {
      const pCcy = e.price_currency || '???';
      liveInfo = ` | live price: ${pCcy} ${e.live_price.toFixed(2)}`;
      if (e.live_value != null) {
        liveInfo += ` | live value: ${pCcy} ${e.live_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (e.live_value_aud != null && pCcy !== 'AUD') {
        liveInfo += ` (AUD ${e.live_value_aud.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ fx ${e.fx_rate_to_aud?.toFixed(4)})`;
      }
      if (e.day_change_pct != null) {
        liveInfo += ` | day: ${e.day_change_pct >= 0 ? '+' : ''}${e.day_change_pct.toFixed(2)}%`;
      }
    }
    return `  ${h.asset_name} (${h.source}, ${h.asset_class}): base ${ccy} ${h.valuation_base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${h.ticker_symbol ? ` [${h.ticker_symbol}]` : ''}${qty}${liveInfo}`;
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

HOLDINGS (with currency, quantity, and live data where available):
${holdingLines.join('\n')}
${marketContext}
${benchmarkContext}
${prevSnapshot ? `\nPREVIOUS SNAPSHOT (${prevSnapshot.snapshot_date}):\nTotal (AUD): ${formatCurrency(prevSnapshot.total_value)}` : ''}
`;

  console.log(portfolioContext);

  // ── 7. PII masking ────────────────────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 7: Context string AFTER PII masking');
  console.log(sep);

  const maskedContext = maskPII(portfolioContext);
  console.log(maskedContext);

  // Diff: show what changed
  if (maskedContext !== portfolioContext) {
    console.log('\n--- PII MASKING CHANGES ---');
    const origLines = portfolioContext.split('\n');
    const maskedLines = maskedContext.split('\n');
    for (let i = 0; i < origLines.length; i++) {
      if (origLines[i] !== maskedLines[i]) {
        console.log(`  Line ${i + 1}:`);
        console.log(`    BEFORE: ${origLines[i]}`);
        console.log(`    AFTER:  ${maskedLines[i]}`);
      }
    }
  } else {
    console.log('\n(No changes from PII masking)');
  }

  // ── 8. Generate briefing ──────────────────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 8: Generating briefing via AI');
  console.log(sep);

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: BRIEFING_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Generate today's wealth briefing based on this portfolio data:\n\n${maskedContext}`,
      },
    ],
  });

  const briefingText = message.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  console.log('\n--- GENERATED BRIEFING ---\n');
  console.log(briefingText);
  console.log(`\n(tokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out)`);

  // ── 9. Ask AI to audit its own numbers ────────────────────────────────────
  console.log(`\n${sep}`);
  console.log('STEP 9: AI self-audit — checking every number');
  console.log(sep);

  const auditMessage = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: 'You are a financial data auditor. Be precise and flag every discrepancy. The base currency is AUD.',
    messages: [
      {
        role: 'user',
        content: `I have the raw data that was fed to an AI, and the briefing it produced. Please audit the briefing against the raw data.

For every number in the briefing:
1. State the number and what it claims to represent
2. Find the corresponding value in the raw data
3. Mark it as CORRECT, WRONG (with the right value), or UNVERIFIABLE (not in raw data)

Also flag:
- Any currency mixing (e.g. USD values treated as AUD without conversion)
- Any math errors in calculated totals
- Any values that appear fabricated (not traceable to the data)
- Any missing AUD conversion where non-AUD values are used
- Whether commodity units (troy oz, barrel) are stated correctly

RAW DATA:
${portfolioContext}

BRIEFING:
${briefingText}`,
      },
    ],
  });

  const auditText = auditMessage.content
    .filter((b) => b.type === 'text')
    .map((b) => ('text' in b ? b.text : ''))
    .join('');

  console.log('\n--- AUDIT RESULTS ---\n');
  console.log(auditText);

  console.log(`\n${sep}`);
  console.log('DIAGNOSTIC COMPLETE');
  console.log(sep);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
