/**
 * Test script: diagnose how GOLD ticker is resolved and priced.
 *
 * Run: npx tsx scripts/test-gold-resolution.ts
 */

import { resolveSymbol } from '../src/lib/market-data';

console.log('=== GOLD TICKER RESOLUTION TEST ===\n');

// Test 1: resolveSymbol with different asset classes
const cases: Array<{ ticker: string; assetClass?: string; expectedSymbol: string; label: string }> = [
  { ticker: 'GOLD', label: 'No asset_class', expectedSymbol: 'GOLD' },
  { ticker: 'GOLD', assetClass: 'Equity', label: 'Equity', expectedSymbol: 'GOLD' },
  { ticker: 'GOLD', assetClass: 'Alternative', label: 'Alternative', expectedSymbol: 'GC=F' },
  { ticker: 'GOLD', assetClass: 'Commodity', label: 'Commodity', expectedSymbol: 'GC=F' },
  { ticker: 'GOLD', assetClass: 'Cash', label: 'Cash', expectedSymbol: 'GOLD' },
];

let allPassed = true;

for (const c of cases) {
  const result = resolveSymbol(c.ticker, c.assetClass);
  const pass = result === c.expectedSymbol;
  if (!pass) allPassed = false;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} | resolveSymbol("${c.ticker}", ${c.assetClass ? `"${c.assetClass}"` : 'undefined'}) => "${result}" (expected "${c.expectedSymbol}") [${c.label}]`,
  );
}

console.log('\n=== LIVE PRICE FETCH ===\n');

// Test 2: Actually fetch quotes to see what Yahoo returns
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance();

async function fetchAndShow(symbol: string, label: string) {
  try {
    const q = await yf.quote(symbol);
    console.log(`${label} (${symbol}):`);
    console.log(`  Name:     ${q.shortName ?? q.longName ?? 'N/A'}`);
    console.log(`  Price:    ${q.regularMarketPrice}`);
    console.log(`  Currency: ${q.currency}`);
    console.log(`  Exchange: ${q.exchange}`);
    console.log(`  Type:     ${q.quoteType}`);
    console.log();
  } catch (err: any) {
    console.log(`${label} (${symbol}): ERROR - ${err.message}\n`);
  }
}

async function main() {
  await fetchAndShow('GOLD', 'Barrick Gold (equity ticker)');
  await fetchAndShow('GC=F', 'Gold Futures (commodity)');

  console.log('=== CALCULATION WALKTHROUGH ===\n');
  console.log('When a holding has ticker_symbol="GOLD" and asset_class="Equity":');
  console.log('  1. resolveSymbol("GOLD", "Equity") => "GOLD" (NOT remapped)');
  console.log('  2. Yahoo Finance fetches quote for "GOLD" => Barrick Gold Corp');
  console.log('  3. Price should be ~$20-25 USD per share');
  console.log('  4. live_value = price * quantity');
  console.log('  5. live_value_aud = live_value * (1 / AUDUSD rate)');
  console.log();
  console.log('When a holding has ticker_symbol="GOLD" and asset_class="Commodity":');
  console.log('  1. resolveSymbol("GOLD", "Commodity") => "GC=F" (remapped!)');
  console.log('  2. Yahoo Finance fetches quote for "GC=F" => Gold Futures');
  console.log('  3. Price would be ~$2,500-3,000+ USD per troy oz');
  console.log('  4. This would massively inflate portfolio value');
  console.log();

  if (allPassed) {
    console.log('ALL RESOLUTION TESTS PASSED');
  } else {
    console.log('SOME RESOLUTION TESTS FAILED - see above');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
