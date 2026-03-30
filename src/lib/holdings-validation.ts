import { ASSET_CLASSES, type AssetClass } from '@/lib/types';

/**
 * Validate and normalize holdings extracted by Claude before DB insertion.
 * Catches malformed data, normalizes asset_ids for consistency, and
 * sanitizes strings.
 */

const VALID_ASSET_CLASSES = new Set<string>(ASSET_CLASSES);

// 3-letter ISO 4217 currency codes we expect
const VALID_CURRENCIES = new Set([
  'AUD', 'USD', 'EUR', 'GBP', 'CHF', 'JPY', 'HKD', 'SGD', 'NZD', 'CAD',
  'ILS', 'ZAR', 'SEK', 'NOK', 'DKK', 'CNY', 'INR', 'KRW', 'TWD', 'THB',
  'MYR', 'PHP', 'IDR', 'BRL', 'MXN', 'CLP', 'COP', 'PEN', 'ARS',
]);

export interface ValidationResult {
  valid: Array<{
    asset_id: string;
    source: string;
    asset_name: string;
    asset_class: string;
    ticker_symbol: string | null;
    quantity: number | null;
    valuation_base: number;
    valuation_date: string;
    currency: string;
    is_static: boolean;
  }>;
  warnings: string[];
  dropped: number;
}

/**
 * Normalize an asset_id to be deterministic and consistent.
 * Strips source names, random suffixes, and normalizes format.
 */
export function normalizeAssetId(raw: string, ticker: string | null, assetClass: string): string {
  // If we have a ticker, derive asset_id deterministically from it
  if (ticker && ticker.trim()) {
    const t = ticker.trim().toLowerCase();
    // Map asset class to prefix
    const prefix = assetClassPrefix(assetClass);
    // Normalize ticker: replace dots, equals, slashes with dashes
    const normalized = t.replace(/[.=\/]/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${prefix}-${normalized}`;
  }

  // No ticker — use the raw asset_id but normalize it
  let id = raw.trim().toLowerCase();
  // Remove any random-looking numeric suffixes (e.g., "cash-aud-001" → "cash-aud")
  id = id.replace(/-\d{3,}$/, '');
  // Remove source prefixes if present (e.g., "ubs-eq-bhp" → "eq-bhp")
  // Only strip known bank prefixes that shouldn't be in asset_ids
  id = id.replace(/^(ubs|jbwere|stonehage|bellpotter|macquarie|morgan-stanley|commsec)-/i, '');
  // Normalize characters
  id = id.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return id || raw.trim().toLowerCase();
}

function assetClassPrefix(assetClass: string): string {
  switch (assetClass) {
    case 'Equity': return 'eq';
    case 'Bond': return 'bond';
    case 'Cash': return 'cash';
    case 'Alternative': return 'alt';
    case 'Private Equity': return 'pe';
    case 'Commodity': return 'cmd';
    case 'Cryptocurrency': return 'crypto';
    case 'Currency': return 'fx';
    default: return 'unk';
  }
}

/**
 * Validate and normalize an array of raw holdings from Claude's JSON output.
 */
export function validateAndNormalizeHoldings(
  raw: unknown[],
  overrideSource?: string,
): ValidationResult {
  const valid: ValidationResult['valid'] = [];
  const warnings: string[] = [];
  let dropped = 0;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    const issues: string[] = [];

    // --- Required fields ---
    if (!item || typeof item !== 'object') {
      warnings.push(`[${i}] Not an object, skipped`);
      dropped++;
      continue;
    }

    // asset_name
    const assetName = typeof item.asset_name === 'string' ? item.asset_name.trim() : '';
    if (!assetName) {
      warnings.push(`[${i}] Missing asset_name, skipped`);
      dropped++;
      continue;
    }

    // asset_class — coerce to valid value
    let assetClass = typeof item.asset_class === 'string' ? item.asset_class.trim() : '';
    if (!VALID_ASSET_CLASSES.has(assetClass)) {
      // Try case-insensitive match
      const match = ASSET_CLASSES.find((ac) => ac.toLowerCase() === assetClass.toLowerCase());
      if (match) {
        assetClass = match;
      } else {
        // Map common alternatives
        const mapped = mapAssetClass(assetClass);
        if (mapped) {
          issues.push(`asset_class "${assetClass}" mapped to "${mapped}"`);
          assetClass = mapped;
        } else {
          warnings.push(`[${i}] "${assetName}": invalid asset_class "${assetClass}", defaulting to "Alternative"`);
          assetClass = 'Alternative';
        }
      }
    }

    // valuation_base
    let valuationBase = typeof item.valuation_base === 'number'
      ? item.valuation_base
      : typeof item.valuation_base === 'string'
        ? parseFloat(String(item.valuation_base).replace(/[,$]/g, ''))
        : NaN;
    if (isNaN(valuationBase) || valuationBase < 0) {
      warnings.push(`[${i}] "${assetName}": invalid valuation_base "${item.valuation_base}", skipped`);
      dropped++;
      continue;
    }

    // valuation_date
    let valuationDate = typeof item.valuation_date === 'string' ? item.valuation_date.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valuationDate)) {
      issues.push(`valuation_date "${valuationDate}" invalid, using today`);
      valuationDate = new Date().toISOString().split('T')[0];
    }

    // ticker_symbol
    let ticker = item.ticker_symbol != null && typeof item.ticker_symbol === 'string'
      ? item.ticker_symbol.trim() || null
      : null;

    // currency
    let currency = typeof item.currency === 'string' ? item.currency.trim().toUpperCase() : 'AUD';
    if (currency === 'GBP' && ticker?.endsWith('.L')) {
      // Statement might say GBP but values could be in pence — keep as GBP,
      // the market-data layer handles GBp normalization from Yahoo
    }
    if (currency.length !== 3) {
      issues.push(`currency "${currency}" invalid, defaulting to AUD`);
      currency = 'AUD';
    }
    // Accept any 3-letter code but warn on unknown
    if (!VALID_CURRENCIES.has(currency) && currency !== 'GBP') {
      issues.push(`currency "${currency}" not in common list (accepted anyway)`);
    }

    // quantity
    let quantity: number | null = null;
    if (item.quantity != null) {
      const q = typeof item.quantity === 'number'
        ? item.quantity
        : parseFloat(String(item.quantity).replace(/[,$]/g, ''));
      if (!isNaN(q)) quantity = q;
    }

    // Sanity check: if quantity and valuation look like per-unit was used
    if (quantity != null && quantity > 0 && ticker && valuationBase > 0) {
      const impliedPrice = valuationBase / quantity;
      // If implied price < $0.001, valuation_base is suspiciously low (possibly per-unit)
      // If implied price > $1,000,000, valuation_base is suspiciously high
      if (impliedPrice < 0.001) {
        issues.push(`valuation_base ${valuationBase} with qty ${quantity} implies price $${impliedPrice.toFixed(6)} — may be per-unit instead of total`);
      }
    }

    // source
    const source = overrideSource
      || (typeof item.source === 'string' ? item.source.trim().slice(0, 200) : 'Unknown');

    // asset_id — normalize for consistency
    const rawAssetId = typeof item.asset_id === 'string' ? item.asset_id.trim() : '';
    const assetId = rawAssetId
      ? normalizeAssetId(rawAssetId, ticker, assetClass)
      : normalizeAssetId(assetName.toLowerCase().replace(/\s+/g, '-'), ticker, assetClass);

    if (rawAssetId && assetId !== rawAssetId.trim().toLowerCase()) {
      issues.push(`asset_id normalized: "${rawAssetId}" → "${assetId}"`);
    }

    if (issues.length > 0) {
      warnings.push(`[${i}] "${assetName}": ${issues.join('; ')}`);
    }

    valid.push({
      asset_id: assetId,
      source,
      asset_name: assetName.slice(0, 500),
      asset_class: assetClass,
      ticker_symbol: ticker,
      quantity,
      valuation_base: valuationBase,
      valuation_date: valuationDate,
      currency,
      is_static: true,
    });
  }

  return { valid, warnings, dropped };
}

function mapAssetClass(raw: string): AssetClass | null {
  const lower = raw.toLowerCase();
  if (['stock', 'stocks', 'equities', 'shares', 'share'].includes(lower)) return 'Equity';
  if (['bonds', 'fixed income', 'fixed-income', 'debt'].includes(lower)) return 'Bond';
  if (['money market', 'deposit', 'term deposit', 'savings'].includes(lower)) return 'Cash';
  if (['fund', 'hedge fund', 'real estate', 'reit', 'alternatives'].includes(lower)) return 'Alternative';
  if (['pe', 'venture', 'vc', 'private'].includes(lower)) return 'Private Equity';
  if (['commodities', 'gold', 'silver', 'oil'].includes(lower)) return 'Commodity';
  if (['crypto', 'bitcoin', 'digital asset', 'digital assets'].includes(lower)) return 'Cryptocurrency';
  if (['forex', 'fx', 'foreign exchange'].includes(lower)) return 'Currency';
  return null;
}
