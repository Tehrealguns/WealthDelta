import { toDecimal } from '@/lib/decimal';

// Direct Yahoo Finance HTTP API (bypasses yahoo-finance2 library which gets blocked on cloud IPs)
const YF_BASE = 'https://query1.finance.yahoo.com';
const YF_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

export interface QuoteResult {
  symbol: string;
  price: number | null;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  name: string | null;
  marketState: string | null;
}

const quoteCache = new Map<string, { data: QuoteResult; expiry: number }>();
const CACHE_TTL = 15 * 60 * 1000;

const BENCHMARK_SYMBOLS: Record<string, string> = {
  'GC=F': 'Gold (XAU/USD)',
  'SI=F': 'Silver (XAG/USD)',
  'CL=F': 'WTI Crude Oil',
  'BZ=F': 'Brent Crude Oil',
  'BTC-USD': 'Bitcoin',
  'ETH-USD': 'Ethereum',
  'AUDUSD=X': 'AUD/USD',
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  '^GSPC': 'S&P 500',
  '^DJI': 'Dow Jones',
  '^IXIC': 'NASDAQ',
  '^AXJO': 'ASX 200',
  '^FTSE': 'FTSE 100',
  'DX-Y.NYB': 'US Dollar Index',
};

// Aliases that are always safe (the raw string is never an equity ticker)
const TICKER_ALIASES: Record<string, string> = {
  'XAU': 'GC=F',
  'XAG': 'SI=F',
  'OIL': 'CL=F',
  'WTI': 'CL=F',
  'BRENT': 'BZ=F',
  'BTC': 'BTC-USD',
  'BITCOIN': 'BTC-USD',
  'ETH': 'ETH-USD',
  'ETHEREUM': 'ETH-USD',
  'AUD/USD': 'AUDUSD=X',
  'AUDUSD': 'AUDUSD=X',
  'EUR/USD': 'EURUSD=X',
  'EURUSD': 'EURUSD=X',
  'GBP/USD': 'GBPUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USD/JPY': 'USDJPY=X',
  'USDJPY': 'USDJPY=X',
  'SPX': '^GSPC',
  'S&P': '^GSPC',
  'S&P500': '^GSPC',
  'DOW': '^DJI',
  'NASDAQ': '^IXIC',
  'ASX200': '^AXJO',
  'ASX': '^AXJO',
  'FTSE': '^FTSE',
  'DXY': 'DX-Y.NYB',
};

// Aliases only applied when the holding is a commodity/alternative (not equity)
const COMMODITY_ALIASES: Record<string, string> = {
  'GOLD': 'GC=F',
  'SILVER': 'SI=F',
};

const COMMODITY_ASSET_CLASSES = new Set(['Commodity', 'Alternative']);

// Yahoo Finance returns some currencies in sub-units (e.g., pence instead of pounds).
// Map: sub-unit code → { base currency, divisor }
const SUB_UNIT_CURRENCIES: Record<string, { currency: string; divisor: number }> = {
  'GBp': { currency: 'GBP', divisor: 100 },  // British pence → pounds
  'ILA': { currency: 'ILS', divisor: 100 },   // Israeli agora → shekel
  'ZAc': { currency: 'ZAR', divisor: 100 },   // South African cents → rand
};

export function resolveSymbol(raw: string, assetClass?: string): string {
  const upper = raw.trim().toUpperCase();
  if (TICKER_ALIASES[upper]) return TICKER_ALIASES[upper];
  // Only resolve ambiguous commodity tickers when explicitly marked as commodity/alternative
  if (assetClass && COMMODITY_ASSET_CLASSES.has(assetClass) && COMMODITY_ALIASES[upper]) {
    return COMMODITY_ALIASES[upper];
  }
  return raw.trim();
}

export async function getQuote(symbol: string): Promise<QuoteResult> {
  const resolved = resolveSymbol(symbol);
  const cached = quoteCache.get(resolved);
  if (cached && Date.now() < cached.expiry) return cached.data;

  const empty: QuoteResult = {
    symbol: resolved, price: null, previousClose: null,
    change: null, changePct: null, currency: null, name: null, marketState: null,
  };

  try {
    const url = `${YF_BASE}/v8/finance/chart/${encodeURIComponent(resolved)}?range=2d&interval=1d`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      console.error(`[market-data] getQuote HTTP ${res.status} for "${resolved}"`);
      return empty;
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return empty;

    const meta = result.meta;
    const closes = result.indicators?.quote?.[0]?.close;
    const currentPrice = meta?.regularMarketPrice ?? null;
    const prevClose = meta?.chartPreviousClose ?? (closes && closes.length >= 2 ? closes[closes.length - 2] : null);

    let quoteCurrency: string | null = meta?.currency ?? null;
    let quotePrice = currentPrice;
    let quotePrevClose = prevClose;

    // Normalize sub-unit currencies (GBp → GBP, ZAc → ZAR, ILA → ILS, etc.)
    // Yahoo Finance returns some exchange prices in sub-units; divide to get base currency.
    if (quoteCurrency && SUB_UNIT_CURRENCIES[quoteCurrency]) {
      const { currency, divisor } = SUB_UNIT_CURRENCIES[quoteCurrency];
      console.log(`[market-data] normalizing ${quoteCurrency} → ${currency} (÷${divisor}) for ${resolved}`);
      quoteCurrency = currency;
      if (quotePrice != null) quotePrice /= divisor;
      if (quotePrevClose != null) quotePrevClose /= divisor;
    }

    const quote: QuoteResult = {
      symbol: resolved,
      price: quotePrice,
      previousClose: quotePrevClose,
      change: quotePrice != null && quotePrevClose != null ? quotePrice - quotePrevClose : null,
      changePct: quotePrice != null && quotePrevClose != null && quotePrevClose !== 0
        ? ((quotePrice - quotePrevClose) / quotePrevClose) * 100 : null,
      currency: quoteCurrency,
      name: meta?.shortName ?? meta?.longName ?? null,
      marketState: meta?.marketState ?? null,
    };

    quoteCache.set(resolved, { data: quote, expiry: Date.now() + CACHE_TTL });
    return quote;
  } catch (err) {
    console.error(`[market-data] getQuote failed for "${resolved}":`, err instanceof Error ? err.message : err);
    return empty;
  }
}

export async function getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const results = new Map<string, QuoteResult>();
  const toFetch: string[] = [];

  for (const sym of symbols) {
    const resolved = resolveSymbol(sym);
    const cached = quoteCache.get(resolved);
    if (cached && Date.now() < cached.expiry) {
      results.set(sym, cached.data);
      results.set(resolved, cached.data);
    } else {
      toFetch.push(resolved);
    }
  }

  if (toFetch.length > 0) {
    const settled = await Promise.allSettled(toFetch.map((s) => getQuote(s)));
    for (let i = 0; i < toFetch.length; i++) {
      const result = settled[i];
      if (result.status === 'fulfilled') {
        results.set(toFetch[i], result.value);
      } else {
        console.error(`[market-data] getQuotes: rejected for "${toFetch[i]}":`, result.reason);
      }
    }
  }

  return results;
}

export interface EnrichedHolding {
  asset_id: string;
  ticker_symbol: string | null;
  quantity: number | null;
  valuation_base: number;
  live_price: number | null;
  live_value: number | null;
  live_value_aud: number | null;
  day_change: number | null;
  day_change_pct: number | null;
  price_currency: string | null;
  fx_rate_to_aud: number | null;
  stale: boolean;
  fx_failed: boolean;
}

// FX pairs relative to USD (Yahoo returns "1 base = X USD" for pairs like AUDUSD=X)
const FX_PAIRS: Record<string, string> = {
  'USD': 'AUDUSD=X',   // 1 AUD = X USD → to convert USD→AUD: divide by rate
  'EUR': 'EURUSD=X',   // 1 EUR = X USD
  'GBP': 'GBPUSD=X',   // 1 GBP = X USD
  'CHF': 'USDCHF=X',   // 1 USD = X CHF
  'JPY': 'USDJPY=X',   // 1 USD = X JPY
  'HKD': 'USDHKD=X',   // 1 USD = X HKD
  'SGD': 'USDSGD=X',   // 1 USD = X SGD
  'NZD': 'NZDUSD=X',   // 1 NZD = X USD
  'CAD': 'USDCAD=X',   // 1 USD = X CAD
  'ILS': 'USDILS=X',   // 1 USD = X ILS
  'ZAR': 'USDZAR=X',   // 1 USD = X ZAR
};

// Currencies where the pair is XXX/USD (value = 1 base = X USD)
const XXX_USD_PAIRS = new Set(['EUR', 'GBP', 'NZD']);

async function getFxRateToAUD(currency: string): Promise<number | null> {
  if (currency === 'AUD') return 1;

  // Get AUD/USD rate first
  const audUsdQuote = await getQuote('AUDUSD=X');
  const audUsd = audUsdQuote?.price;
  if (!audUsd) {
    console.error(`[market-data] getFxRateToAUD: AUDUSD=X quote failed, cannot convert ${currency}`);
    return null;
  }

  if (currency === 'USD') {
    // USD → AUD: divide by AUDUSD rate (e.g., $100 USD / 0.70 = A$142.86)
    return 1 / audUsd;
  }

  // For other currencies, convert via USD
  const pairSymbol = FX_PAIRS[currency];
  if (!pairSymbol) {
    console.error(`[market-data] getFxRateToAUD: no FX pair for currency "${currency}"`);
    return null;
  }

  const fxQuote = await getQuote(pairSymbol);
  const fxRate = fxQuote?.price;
  if (!fxRate) return null;

  if (XXX_USD_PAIRS.has(currency)) {
    // These pairs are XXXUSD (1 EUR/GBP/NZD = X USD), so multiply by fxRate to get USD, then convert to AUD
    return fxRate / audUsd;
  }
  // All other pairs are USDXXX (1 USD = X foreign), so 1 foreign = 1/X USD
  return (1 / fxRate) / audUsd;
}

export async function enrichHoldings(
  holdings: Array<{
    asset_id: string;
    ticker_symbol: string | null;
    quantity: number | null;
    valuation_base: number;
    asset_class?: string;
    currency?: string;
  }>,
): Promise<EnrichedHolding[]> {
  const resolvedTickers = holdings
    .filter((h) => h.ticker_symbol != null && h.ticker_symbol.length > 0)
    .map((h) => resolveSymbol(h.ticker_symbol!, h.asset_class));

  const uniqueTickers = [...new Set(resolvedTickers)];
  console.log(`[market-data] enrichHoldings: ${holdings.length} holdings, ${uniqueTickers.length} unique tickers to fetch`);
  const quotes = uniqueTickers.length > 0 ? await getQuotes(uniqueTickers) : new Map();
  const gotPrices = [...quotes.values()].filter(q => q.price != null).length;
  const failed = [...quotes.values()].filter(q => q.price == null).length;
  console.log(`[market-data] enrichHoldings: ${gotPrices} quotes succeeded, ${failed} failed`);

  // Pre-fetch FX rates for any non-AUD price currencies (parallelized)
  const priceCurrencies = new Set<string>();
  for (const h of holdings) {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;
    const quote = resolved ? quotes.get(resolved) : undefined;
    if (quote?.currency && quote.currency !== 'AUD') {
      priceCurrencies.add(quote.currency);
    }
  }
  const fxRates = new Map<string, number>();
  fxRates.set('AUD', 1);
  const fxFailedCurrencies = new Set<string>();

  const fxEntries = [...priceCurrencies];
  const fxResults = await Promise.allSettled(
    fxEntries.map((ccy) => getFxRateToAUD(ccy)),
  );
  for (let i = 0; i < fxEntries.length; i++) {
    const ccy = fxEntries[i];
    const result = fxResults[i];
    if (result.status === 'fulfilled' && result.value != null) {
      fxRates.set(ccy, result.value);
    } else {
      fxFailedCurrencies.add(ccy);
      const reason = result.status === 'rejected' ? (result.reason instanceof Error ? result.reason.message : result.reason) : 'null rate';
      console.error(`[market-data] FX rate failed for ${ccy} → AUD (${reason}), holdings in this currency will use base valuation`);
    }
  }

  return holdings.map((h) => {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;
    const quote = resolved ? quotes.get(resolved) : undefined;

    let liveValue: number | null = null;
    let liveValueAud: number | null = null;
    const priceCcy = quote?.currency ?? null;
    let fxRate: number | null = null;
    let fxFailed = false;

    if (quote?.price != null && h.quantity != null) {
      liveValue = toDecimal(quote.price).times(toDecimal(h.quantity)).toNumber();
      const ccy = quote.currency ?? null;

      if (ccy && ccy !== 'AUD') {
        const rate = fxRates.get(ccy);
        if (rate != null) {
          fxRate = rate;
          liveValueAud = toDecimal(liveValue).times(toDecimal(rate)).toNumber();
        } else {
          // FX conversion failed — do NOT silently treat foreign currency as AUD.
          // Leave liveValueAud null so callers fall back to base valuation (which was
          // originally extracted in the correct currency from the statement).
          fxFailed = true;
          liveValueAud = null;
        }
      } else {
        // Already AUD or unknown currency with no quote currency info
        fxRate = 1;
        liveValueAud = liveValue;
      }
    }

    return {
      asset_id: h.asset_id,
      ticker_symbol: h.ticker_symbol,
      quantity: h.quantity,
      valuation_base: h.valuation_base,
      live_price: quote?.price ?? null,
      live_value: liveValue,
      live_value_aud: liveValueAud,
      day_change: quote?.change ?? null,
      day_change_pct: quote?.changePct ?? null,
      price_currency: priceCcy,
      fx_rate_to_aud: fxRate,
      stale: quote?.price == null,
      fx_failed: fxFailed,
    };
  });
}

export async function fetchBenchmarks(watchItems?: string): Promise<string> {
  const symbols = new Set(Object.keys(BENCHMARK_SYMBOLS));

  if (watchItems) {
    for (const raw of watchItems.split(',')) {
      const s = raw.trim();
      if (s) symbols.add(resolveSymbol(s));
    }
  }

  const allSymbols = [...symbols];
  console.log(`[market-data] fetchBenchmarks: fetching ${allSymbols.length} benchmark symbols`);
  const quotes = await getQuotes(allSymbols);
  const benchGot = [...quotes.values()].filter(q => q.price != null).length;
  console.log(`[market-data] fetchBenchmarks: ${benchGot}/${allSymbols.length} benchmarks returned prices`);
  const lines: string[] = [];

  for (const [sym, label] of Object.entries(BENCHMARK_SYMBOLS)) {
    const q = quotes.get(sym);
    if (!q?.price) continue;
    const chg = q.change != null ? `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}` : '';
    const pct = q.changePct != null ? `(${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)` : '';
    lines.push(`  ${label} (${sym}): $${q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${chg} ${pct}`.trim());
  }

  if (watchItems) {
    for (const raw of watchItems.split(',')) {
      const s = raw.trim();
      if (!s) continue;
      const resolved = resolveSymbol(s);
      if (BENCHMARK_SYMBOLS[resolved]) continue;
      const q = quotes.get(resolved);
      if (!q?.price) continue;
      const chg = q.change != null ? `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)}` : '';
      const pct = q.changePct != null ? `(${q.changePct >= 0 ? '+' : ''}${q.changePct.toFixed(2)}%)` : '';
      const name = q.name || resolved;
      lines.push(`  ${name} (${resolved}): $${q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${chg} ${pct}`.trim());
    }
  }

  return lines.length > 0
    ? `\nGLOBAL BENCHMARKS & WATCHED ASSETS (live):\n${lines.join('\n')}`
    : '';
}

export function buildMarketContext(enriched: EnrichedHolding[]): string {
  const withPrices = enriched.filter((e) => e.live_price != null);
  if (withPrices.length === 0) return '';

  // De-duplicate by ticker (same ticker may appear multiple times)
  const seen = new Set<string>();
  const unique = withPrices.filter((e) => {
    if (!e.ticker_symbol || seen.has(e.ticker_symbol)) return false;
    seen.add(e.ticker_symbol);
    return true;
  });

  const lines = unique.map((e) => {
    const ccy = e.price_currency || 'UNK';
    const chg = e.day_change != null ? `${e.day_change >= 0 ? '+' : ''}${e.day_change.toFixed(2)}` : '';
    const chgPct = e.day_change_pct != null ? `(${e.day_change_pct >= 0 ? '+' : ''}${e.day_change_pct.toFixed(2)}%)` : '';

    let detail: string;
    if (e.quantity != null && e.live_value != null) {
      detail = `${e.quantity} units @ ${ccy} ${e.live_price!.toFixed(2)} = ${ccy} ${e.live_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (ccy !== 'AUD' && e.live_value_aud != null && e.fx_rate_to_aud != null) {
        detail += ` (AUD ${e.live_value_aud.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ fx ${e.fx_rate_to_aud.toFixed(4)})`;
      } else if (ccy !== 'AUD' && e.fx_failed) {
        detail += ` [FX CONVERSION FAILED — do NOT use this value as AUD, use base valuation instead]`;
      }
    } else {
      detail = `price: ${ccy} ${e.live_price!.toFixed(2)} (quantity not available, using base valuation)`;
    }

    return `  ${e.ticker_symbol} [${ccy}]: ${detail} | day: ${chg} ${chgPct}`.trim();
  });

  // Add data quality warnings
  const staleCount = enriched.filter((e) => e.stale).length;
  const fxFailCount = enriched.filter((e) => e.fx_failed).length;
  const warnings: string[] = [];
  if (staleCount > 0) warnings.push(`${staleCount} holdings have no live price (using base valuation)`);
  if (fxFailCount > 0) warnings.push(`${fxFailCount} holdings have failed FX conversion (using base valuation, NOT live price)`);

  let header = '\nLIVE MARKET DATA (portfolio holdings with currency):';
  if (warnings.length > 0) {
    header += `\n  ⚠ DATA QUALITY: ${warnings.join('; ')}`;
  }

  return `${header}\n${lines.join('\n')}`;
}

/**
 * Best-effort AUD value for a holding, for use in portfolio totals.
 * Fallback order:
 *   1. live_value_aud  — FX-converted live price (best)
 *   2. live_value      — only when price_currency is AUD or absent (safe, no FX needed)
 *   3. valuation_base  — stale value from PDF import (last resort)
 */
export function holdingValueAud(
  h: { valuation_base: number },
  e: EnrichedHolding,
): number {
  if (e.live_value_aud != null) return e.live_value_aud;
  // live_value is safe to use when the quote currency IS AUD (no FX conversion needed)
  if (e.live_value != null && (!e.price_currency || e.price_currency === 'AUD')) {
    return e.live_value;
  }
  return h.valuation_base;
}
