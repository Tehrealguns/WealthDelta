import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { resolveSymbol, enrichHoldings, buildMarketContext, fetchBenchmarks } from '@/lib/market-data';
import { toDecimal, formatCurrency } from '@/lib/decimal';
import type { HoldingRow } from '@/lib/types';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Auth: require CRON_SECRET as bearer token or query param
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('secret');
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createServiceClient(supabaseUrl, supabaseKey);

  // Get target user (pass ?email= or defaults to first user)
  const targetEmail = request.nextUrl.searchParams.get('email');

  const { data: usersData } = await supabase.auth.admin.listUsers();
  const users = usersData?.users ?? [];

  let user;
  if (targetEmail) {
    user = users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
  } else {
    user = users[0]; // default to first user
  }

  if (!user) {
    return NextResponse.json({
      error: 'User not found',
      available: users.map((u) => u.email),
    }, { status: 404 });
  }

  const userId = user.id;
  const log: string[] = [];
  const addLog = (msg: string) => { log.push(msg); };

  addLog(`=== AUDIT FOR: ${user.email} (${userId}) ===\n`);

  // Fetch holdings
  const { data: holdings, error: hErr } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId) as { data: HoldingRow[] | null; error: any };

  if (hErr || !holdings?.length) {
    return NextResponse.json({ error: 'No holdings', details: hErr?.message }, { status: 404 });
  }

  addLog(`Found ${holdings.length} holdings\n`);

  // Step 1: Show raw holdings + ticker resolution
  addLog('--- RAW HOLDINGS & TICKER RESOLUTION ---\n');
  for (const h of holdings) {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : 'N/A';
    const remapped = h.ticker_symbol && resolved !== h.ticker_symbol;
    addLog(
      `${h.asset_name}\n` +
      `  ticker: ${h.ticker_symbol ?? 'null'} → resolved: ${resolved}${remapped ? ' *** REMAPPED ***' : ''}\n` +
      `  asset_class: ${h.asset_class} | qty: ${h.quantity} | valuation: ${formatCurrency(h.valuation_base)} ${h.currency}\n` +
      `  asset_id: ${h.asset_id}\n`,
    );
  }

  // Step 2: Enrich
  addLog('--- ENRICHED WITH LIVE PRICES ---\n');
  const enriched = await enrichHoldings(holdings);

  let totalLive = toDecimal(0);
  let totalBase = toDecimal(0);
  const warnings: string[] = [];

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const val = toDecimal(e.live_value_aud ?? e.live_value ?? h.valuation_base);
    totalLive = totalLive.plus(val);
    totalBase = totalBase.plus(toDecimal(h.valuation_base));

    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;

    addLog(
      `${h.asset_name} [${h.ticker_symbol ?? 'no ticker'}]\n` +
      `  Resolved ticker:  ${resolved ?? 'N/A'}\n` +
      `  Asset class:      ${h.asset_class}\n` +
      `  Quantity:         ${h.quantity ?? 'null'}\n` +
      `  Base valuation:   ${formatCurrency(h.valuation_base)} ${h.currency}\n` +
      `  Live price:       ${e.live_price != null ? `$${e.live_price.toFixed(4)}` : 'N/A'} ${e.price_currency ?? ''}\n` +
      `  Live value:       ${e.live_value != null ? formatCurrency(e.live_value) : 'N/A'} ${e.price_currency ?? ''}\n` +
      `  Live value (AUD): ${e.live_value_aud != null ? formatCurrency(e.live_value_aud) : 'N/A'}\n` +
      `  Stale:            ${e.stale}\n`,
    );

    // Flag suspicious
    if (e.live_value != null && h.valuation_base > 0) {
      const ratio = e.live_value / h.valuation_base;
      if (ratio > 3 || ratio < 0.33) {
        const warn = `WARNING: ${h.asset_name} [${h.ticker_symbol}] — live value is ${ratio.toFixed(1)}x base valuation! Possible ticker mismatch.`;
        warnings.push(warn);
        addLog(`  *** ${warn} ***\n`);
      }
    }

    // Special GOLD check
    if (h.ticker_symbol?.toUpperCase() === 'GOLD' && e.live_price != null && e.live_price > 100) {
      const warn = `BUG DETECTED: ${h.asset_name} has ticker GOLD with price $${e.live_price.toFixed(2)} — this is gold futures (GC=F), NOT Barrick Gold stock (~$20-25). asset_class="${h.asset_class}" is causing the remap!`;
      warnings.push(warn);
      addLog(`  *** ${warn} ***\n`);
    }
  }

  addLog(`\nTOTAL (base): ${formatCurrency(totalBase.toNumber())}`);
  addLog(`TOTAL (live):  ${formatCurrency(totalLive.toNumber())}`);
  const diff = totalLive.minus(totalBase);
  const diffPct = totalBase.toNumber() > 0 ? diff.div(totalBase).times(100).toNumber() : 0;
  addLog(`DIFFERENCE:    ${formatCurrency(diff.toNumber())} (${diffPct.toFixed(2)}%)\n`);

  // Step 3: AI audit
  addLog('--- AI AUDIT ---\n');

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

  const auditPrompt = `You are a portfolio data auditor. I'm giving you the full holdings data for a client. Your job is to:

1. For EVERY holding that has a live price, explain EXACTLY how the live value was calculated:
   - What Yahoo Finance ticker was used (show the resolved ticker)
   - What the live price per unit is (and in what currency)
   - The math: quantity × price = live value
   - If currency conversion was applied, show the FX rate and the converted AUD value
   - Flag if any value looks wrong (e.g., a stock price that seems like a commodity price, or vice versa)

2. Specifically for any holding with ticker "GOLD":
   - State whether this resolved to Barrick Gold Corp (NYSE: GOLD, stock ~$20-25 USD) or Gold Futures (GC=F, ~$2,500-3,000+ USD/oz)
   - If the live price is above $100, FLAG THIS as a bug — gold futures were used instead of the stock
   - Show what asset_class triggered the resolution

3. Check every holding where live value differs from base valuation by more than 3x — flag these as potential bugs

4. Sum up all live values in AUD and confirm the total matches. Show the math.

5. Give a final verdict: PASS (data looks correct) or FAIL (bugs found), with specific details.

PORTFOLIO DATA:
Total (base valuations): ${formatCurrency(totalBase.toNumber())}
Total (live/enriched):   ${formatCurrency(totalLive.toNumber())}
Difference:              ${formatCurrency(diff.toNumber())} (${diffPct.toFixed(2)}%)

HOLDINGS:
${portfolioLines.join('\n')}

${marketContext}
${benchmarkContext}

Be thorough. Show ALL your math. Do not skip any holding with a live price.`;

  try {
    const anthropicClient = getAnthropicClient();
    const response = await anthropicClient.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: auditPrompt }],
    });

    const auditText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => 'text' in b ? b.text : '')
      .join('\n');

    addLog(auditText);
  } catch (err: any) {
    addLog(`AI audit failed: ${err.message}`);
  }

  addLog('\n=== AUDIT COMPLETE ===');

  return NextResponse.json({
    user: user.email,
    holdingsCount: holdings.length,
    totalBase: totalBase.toNumber(),
    totalLive: totalLive.toNumber(),
    difference: diff.toNumber(),
    differencePct: diffPct,
    warnings,
    fullLog: log.join('\n'),
  });
}
