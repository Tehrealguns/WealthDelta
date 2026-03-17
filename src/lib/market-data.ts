import YahooFinance from 'yahoo-finance2';

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

export async function getQuote(symbol: string): Promise<QuoteResult> {
  const cached = quoteCache.get(symbol);
  if (cached && Date.now() < cached.expiry) return cached.data;

  try {
    const result = await yf.quote(symbol);

    const quote: QuoteResult = {
      symbol,
      price: result.regularMarketPrice ?? null,
      previousClose: result.regularMarketPreviousClose ?? null,
      change: result.regularMarketChange ?? null,
      changePct: result.regularMarketChangePercent ?? null,
      currency: result.currency ?? null,
      name: result.shortName ?? result.longName ?? null,
      marketState: result.marketState ?? null,
    };

    quoteCache.set(symbol, { data: quote, expiry: Date.now() + CACHE_TTL });
    return quote;
  } catch {
    return {
      symbol,
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
    const cached = quoteCache.get(sym);
    if (cached && Date.now() < cached.expiry) {
      results.set(sym, cached.data);
    } else {
      toFetch.push(sym);
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

  const uniqueTickers = [...new Set(tickers)];
  const quotes = uniqueTickers.length > 0 ? await getQuotes(uniqueTickers) : new Map();

  return holdings.map((h) => {
    const quote = h.ticker_symbol ? quotes.get(h.ticker_symbol) : undefined;

    let liveValue: number | null = null;
    if (quote?.price != null && h.quantity != null) {
      liveValue = quote.price * h.quantity;
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

  return `\nLIVE MARKET DATA (real-time prices):\n${lines.join('\n')}`;
}
