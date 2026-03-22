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

const TICKER_ALIASES: Record<string, string> = {
  'XAU': 'GC=F',
  'GOLD': 'GC=F',
  'XAG': 'SI=F',
  'SILVER': 'SI=F',
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

export function resolveSymbol(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return TICKER_ALIASES[upper] ?? raw.trim();
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
  day_change: number | null;
  day_change_pct: number | null;
  price_currency: string | null;
  stale: boolean;
}

export async function enrichHoldings(
  holdings: Array<{
    asset_id: string;
    ticker_symbol: string | null;
    quantity: number | null;
    valuation_base: number;
  }>,
): Promise<EnrichedHolding[]> {
  const tickers = holdings
    .map((h) => h.ticker_symbol)
    .filter((t): t is string => t != null && t.length > 0);

  const uniqueTickers = [...new Set(tickers.map(resolveSymbol))];
  const quotes = uniqueTickers.length > 0 ? await getQuotes(uniqueTickers) : new Map();

  return holdings.map((h) => {
    const resolved = h.ticker_symbol ? resolveSymbol(h.ticker_symbol) : null;
    const quote = resolved ? quotes.get(resolved) : undefined;

    let liveValue: number | null = null;
    if (quote?.price != null && h.quantity != null) {
      liveValue = toDecimal(quote.price).times(toDecimal(h.quantity)).toNumber();
    }

    return {
      asset_id: h.asset_id,
      ticker_symbol: h.ticker_symbol,
      quantity: h.quantity,
      valuation_base: h.valuation_base,
      live_price: quote?.price ?? null,
      live_value: liveValue,
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
    const qty = e.quantity != null ? `${e.quantity} shares @ $${e.live_price!.toFixed(2)}` : '';

    return `  ${e.ticker_symbol}: ${qty} = ${liveVal} ${chg} ${chgPct}`.trim();
  });

  return `\nLIVE MARKET DATA (portfolio holdings):\n${lines.join('\n')}`;
}
