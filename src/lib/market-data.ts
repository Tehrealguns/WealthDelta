import YahooFinance from 'yahoo-finance2';
import { toDecimal } from '@/lib/decimal';

const yf = new YahooFinance();

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

  try {
    const result = await yf.quote(resolved);

    const quote: QuoteResult = {
      symbol: resolved,
      price: result.regularMarketPrice ?? null,
      previousClose: result.regularMarketPreviousClose ?? null,
      change: result.regularMarketChange ?? null,
      changePct: result.regularMarketChangePercent ?? null,
      currency: result.currency ?? null,
      name: result.shortName ?? result.longName ?? null,
      marketState: result.marketState ?? null,
    };

    quoteCache.set(resolved, { data: quote, expiry: Date.now() + CACHE_TTL });
    return quote;
  } catch {
    return {
      symbol: resolved,
      price: null,
      previousClose: null,
      change: null,
      changePct: null,
      currency: null,
      name: null,
      marketState: null,
    };
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
  stale: boolean;
}

// FX pairs relative to USD (Yahoo returns "1 base = X USD" for pairs like AUDUSD=X)
const FX_PAIRS: Record<string, string> = {
  'USD': 'AUDUSD=X',   // 1 AUD = X USD → to convert USD→AUD: divide by rate
  'EUR': 'EURUSD=X',   // 1 EUR = X USD
  'GBP': 'GBPUSD=X',   // 1 GBP = X USD
  'CHF': 'USDCHF=X',   // 1 USD = X CHF
  'JPY': 'USDJPY=X',   // 1 USD = X JPY
};

async function getFxRateToAUD(currency: string): Promise<number | null> {
  if (currency === 'AUD') return 1;

  // Get AUD/USD rate first
  const audUsdQuote = await getQuote('AUDUSD=X');
  const audUsd = audUsdQuote?.price;
  if (!audUsd) return null;

  if (currency === 'USD') {
    // USD → AUD: divide by AUDUSD rate (e.g., $100 USD / 0.70 = A$142.86)
    return 1 / audUsd;
  }

  // For other currencies, convert via USD
  const pairSymbol = FX_PAIRS[currency];
  if (!pairSymbol) return null;

  const fxQuote = await getQuote(pairSymbol);
  const fxRate = fxQuote?.price;
  if (!fxRate) return null;

  if (currency === 'EUR' || currency === 'GBP') {
    // These pairs are XXXUSD (1 EUR/GBP = X USD), so multiply by fxRate to get USD, then convert to AUD
    return fxRate / audUsd;
  }
  if (currency === 'CHF') {
    // USDCHF: 1 USD = X CHF → 1 CHF = 1/X USD
    return (1 / fxRate) / audUsd;
  }
  if (currency === 'JPY') {
    // USDJPY: 1 USD = X JPY → 1 JPY = 1/X USD
    return (1 / fxRate) / audUsd;
  }

  return null;
}

export async function enrichHoldings(
  holdings: Array<{
    asset_id: string;
    ticker_symbol: string | null;
    quantity: number | null;
    valuation_base: number;
    asset_class?: string;
  }>,
): Promise<EnrichedHolding[]> {
  const resolvedTickers = holdings
    .filter((h) => h.ticker_symbol != null && h.ticker_symbol.length > 0)
    .map((h) => resolveSymbol(h.ticker_symbol!, h.asset_class));

  const uniqueTickers = [...new Set(resolvedTickers)];
  const quotes = uniqueTickers.length > 0 ? await getQuotes(uniqueTickers) : new Map();

  // Pre-fetch FX rates for any non-AUD price currencies
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
  for (const ccy of priceCurrencies) {
    const rate = await getFxRateToAUD(ccy);
    if (rate != null) fxRates.set(ccy, rate);
  }

  return holdings.map((h) => {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol, h.asset_class) : null;
    const quote = resolved ? quotes.get(resolved) : undefined;

    let liveValue: number | null = null;
    let liveValueAud: number | null = null;
    if (quote?.price != null && h.quantity != null) {
      liveValue = toDecimal(quote.price).times(toDecimal(h.quantity)).toNumber();
      const ccy = quote.currency ?? 'AUD';
      const fxRate = fxRates.get(ccy);
      liveValueAud = fxRate != null
        ? toDecimal(liveValue).times(toDecimal(fxRate)).toNumber()
        : liveValue; // fallback: assume same currency if no FX rate
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
      price_currency: quote?.currency ?? null,
      stale: quote?.price == null,
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

  const quotes = await getQuotes([...symbols]);
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

  const lines = withPrices.map((e) => {
    const liveVal = e.live_value != null ? `$${e.live_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
    const chg = e.day_change != null ? `${e.day_change >= 0 ? '+' : ''}$${e.day_change.toFixed(2)}` : '';
    const chgPct = e.day_change_pct != null ? `(${e.day_change_pct >= 0 ? '+' : ''}${e.day_change_pct.toFixed(2)}%)` : '';
    const qty = e.quantity != null ? `${e.quantity} units @ $${e.live_price!.toFixed(2)}` : '';

    return `  ${e.ticker_symbol}: ${qty} = ${liveVal} ${chg} ${chgPct}`.trim();
  });

  return `\nLIVE MARKET DATA (portfolio holdings):\n${lines.join('\n')}`;
}
