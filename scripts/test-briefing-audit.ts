/**
 * Briefing Audit Test Script
 *
 * Fetches Andrew Silberberg's holdings from Supabase, runs them through
 * the enrichment pipeline, and asks the AI to explain exactly how it
 * calculated each value — then cross-checks against the real data.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx ANTHROPIC_API_KEY=xxx \
 *     npx tsx scripts/test-briefing-audit.ts
 *
 * Or set these in a .env.local file and run:
 *   npx tsx scripts/test-briefing-audit.ts
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { resolveSymbol, enrichHoldings, buildMarketContext, fetchBenchmarks } from '../src/lib/market-data';
import { toDecimal, formatCurrency } from '../src/lib/decimal';
import type { HoldingRow } from '../src/lib/types';

// --- Load env from .env.local if present ---
import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const envPath = resolve(__dirname, '..', '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // no .env.local, rely on env vars
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

async function main() {
  // Step 1: Find Andrew Silberberg's user
  console.log('=== STEP 1: Finding user ===\n');
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
  if (userErr) {
    console.error('Error listing users:', userErr.message);
    process.exit(1);
  }

  const andrew = users.users.find(
    (u) =>
      u.email?.toLowerCase().includes('silberberg') ||
      u.user_metadata?.full_name?.toLowerCase().includes('silberberg') ||
      u.user_metadata?.name?.toLowerCase().includes('silberberg'),
  );

  if (!andrew) {
    console.log('Could not find Andrew Silberberg by email/name. Listing all users:');
    for (const u of users.users) {
      console.log(`  ${u.id} | ${u.email} | ${u.user_metadata?.full_name || u.user_metadata?.name || 'N/A'}`);
    }
    console.log('\nSet USER_ID env var manually and re-run, or check the user list above.');
    process.exit(1);
  }

  const userId = process.env.USER_ID || andrew.id;
  console.log(`Found user: ${andrew.email} (${userId})\n`);

  // Step 2: Fetch holdings
  console.log('=== STEP 2: Fetching holdings ===\n');
  const { data: holdings, error: hErr } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null; error: any };

  if (hErr || !holdings?.length) {
    console.error('Error fetching holdings:', hErr?.message ?? 'No holdings found');
    process.exit(1);
  }

  console.log(`Found ${holdings.length} holdings\n`);

  // Step 3: Show raw holdings with resolution info
  console.log('=== STEP 3: Raw holdings & ticker resolution ===\n');
  for (const h of holdings) {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : 'N/A';
    const remapped = h.ticker_symbol && resolved !== h.ticker_symbol;
    console.log(
      `  ${h.asset_name}` +
      `\n    ticker: ${h.ticker_symbol ?? 'null'} → resolved: ${resolved}${remapped ? ' *** REMAPPED ***' : ''}` +
      `\n    asset_class: ${h.asset_class} | qty: ${h.quantity} | valuation: ${formatCurrency(h.valuation_base)} ${h.currency}` +
      `\n    asset_id: ${h.asset_id}`,
    );
    console.log();
  }

  // Step 4: Enrich with live prices
  console.log('=== STEP 4: Enriching with live market data ===\n');
  const enriched = await enrichHoldings(holdings);

  let totalLive = toDecimal(0);
  let totalBase = toDecimal(0);

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const val = toDecimal(e.live_value_aud ?? e.live_value ?? h.valuation_base);
    totalLive = totalLive.plus(val);
    totalBase = totalBase.plus(toDecimal(h.valuation_base));

    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;

    console.log(
      `  ${h.asset_name} [${h.ticker_symbol ?? 'no ticker'}]` +
      `\n    Resolved ticker:  ${resolved ?? 'N/A'}` +
      `\n    Asset class:      ${h.asset_class}` +
      `\n    Quantity:         ${h.quantity ?? 'null'}` +
      `\n    Base valuation:   ${formatCurrency(h.valuation_base)} ${h.currency}` +
      `\n    Live price:       ${e.live_price != null ? `$${e.live_price.toFixed(4)}` : 'N/A'} ${e.price_currency ?? ''}` +
      `\n    Live value:       ${e.live_value != null ? formatCurrency(e.live_value) : 'N/A'} ${e.price_currency ?? ''}` +
      `\n    Live value (AUD): ${e.live_value_aud != null ? formatCurrency(e.live_value_aud) : 'N/A'}` +
      `\n    Stale:            ${e.stale}`,
    );

    // Flag suspicious values
    if (e.live_value != null && h.valuation_base > 0) {
      const ratio = e.live_value / h.valuation_base;
      if (ratio > 3 || ratio < 0.33) {
        console.log(`    *** WARNING: Live value is ${ratio.toFixed(1)}x the base valuation — possible ticker mismatch! ***`);
      }
    }
    console.log();
  }

  console.log(`\n  TOTAL (base valuations): ${formatCurrency(totalBase.toNumber())}`);
  console.log(`  TOTAL (live/enriched):   ${formatCurrency(totalLive.toNumber())}`);
  const diff = totalLive.minus(totalBase);
  const diffPct = totalBase.toNumber() > 0 ? diff.div(totalBase).times(100).toNumber() : 0;
  console.log(`  DIFFERENCE:              ${formatCurrency(diff.toNumber())} (${diffPct.toFixed(2)}%)`);

  if (Math.abs(diffPct) > 50) {
    console.log(`\n  *** ALERT: Portfolio value changed by ${diffPct.toFixed(0)}% — likely a ticker resolution bug! ***`);
  }

  // Step 5: Build context and ask AI to audit
  console.log('\n=== STEP 5: AI Audit — asking Claude to explain every calculation ===\n');

  const marketContext = buildMarketContext(enriched);
  const benchmarkContext = await fetchBenchmarks('');

  const portfolioLines = holdings.map((h, i) => {
    const e = enriched[i];
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;
    const qty = h.quantity != null ? ` | Qty: ${h.quantity}` : '';
    const liveCcy = e?.price_currency && e.price_currency !== 'AUD' ? ` ${e.price_currency}` : '';
    const live = e?.live_value != null ? ` | Live Total: ${formatCurrency(e.live_value)}${liveCcy}` : '';
    const liveAud = e?.live_value_aud != null && e?.price_currency && e.price_currency !== 'AUD'
      ? ` (A$${e.live_value_aud.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      : '';
    const ccy = h.currency && h.currency !== 'AUD' ? ` (${h.currency})` : '';
    const resolvedNote = resolved && resolved !== h.ticker_symbol ? ` → resolved as "${resolved}"` : '';
    return `  ${h.asset_name} | Source: ${h.source} | Class: ${h.asset_class} | Base Value: ${formatCurrency(h.valuation_base)}${ccy}${h.ticker_symbol ? ` [${h.ticker_symbol}${resolvedNote}]` : ''}${qty}${live}${liveAud}`;
  });

  const auditPrompt = `You are a portfolio data auditor. I'm giving you the full holdings data for a client portfolio. Your job is to:

1. For EVERY holding that has a live price, explain EXACTLY how the live value was calculated:
   - What Yahoo Finance ticker was used
   - What the live price per unit is (and in what currency)
   - How quantity × price = live value
   - If currency conversion was applied, show the FX rate used and the converted AUD value
   - Flag if any value looks wrong (e.g., a stock price that seems like a commodity price)

2. Specifically for any holding with ticker "GOLD":
   - State whether this is Barrick Gold Corp (NYSE: GOLD, a stock trading ~$20-25 USD) or Gold Futures (GC=F, ~$2,500-3,000+ USD/oz)
   - Explain which one was used and why
   - If the live price is above $100, FLAG THIS as a bug — it means gold futures were used instead of the stock

3. Compare the total portfolio value (sum of all live values in AUD) against what seems reasonable. Flag any holdings where the live value is more than 3x or less than 0.33x the base valuation.

4. Give a final verdict: Is the portfolio data accurate, or are there bugs?

PORTFOLIO DATA:
Total (base): ${formatCurrency(totalBase.toNumber())}
Total (live):  ${formatCurrency(totalLive.toNumber())}

HOLDINGS:
${portfolioLines.join('\n')}

${marketContext}
${benchmarkContext}

Be specific and show all your math. Do not skip any holding.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: auditPrompt }],
  });

  const auditText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  console.log(auditText);
  console.log('\n=== AUDIT COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
