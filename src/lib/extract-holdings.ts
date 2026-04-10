import { getAnthropicClient, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { validateAndNormalizeHoldings, type ValidationResult } from '@/lib/holdings-validation';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export function isImage(nameOrType: string): boolean {
  if (IMAGE_TYPES.has(nameOrType)) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(nameOrType);
}

export function isPdf(nameOrType: string): boolean {
  if (nameOrType === 'application/pdf') return true;
  return nameOrType.toLowerCase().endsWith('.pdf');
}

export const EXTRACTION_PROMPT = `You are a financial data extraction engine. Extract ALL holdings/assets from this document — it could be a bank statement, portfolio report, screenshot, spreadsheet export, or any financial document.

First, briefly describe what you see in the document (2-3 sentences). Then output the JSON.

Return the holdings as a JSON array wrapped in a \`\`\`json code fence. Each object must have exactly these fields:
- asset_id: a DETERMINISTIC slug based on ticker or asset name (lowercase, e.g. "eq-bhp-ax" for BHP.AX, "cash-aud" for AUD cash, "crypto-btc" for Bitcoin). Use the ticker symbol as the core identifier. Do NOT include random numbers or source names — the same asset must always produce the same asset_id regardless of which document it appears in.
- source: the bank/custodian/platform name as best you can determine
- asset_name: full name of the holding
- asset_class: one of "Equity", "Bond", "Cash", "Alternative", "Private Equity", "Commodity", "Cryptocurrency", "Currency"
- ticker_symbol: stock/ETF/commodity/crypto ticker in Yahoo Finance format. CRITICAL ticker rules:
  * Australian equities: append ".AX" (e.g. "BHP.AX", "CBA.AX", "CSL.AX")
  * US equities: plain ticker (e.g. "AAPL", "MSFT", "GOOGL")
  * UK equities: append ".L" (e.g. "SHEL.L", "BP.L")
  * Gold: "GC=F" | Silver: "SI=F" | Platinum: "PL=F"
  * WTI Oil: "CL=F" | Brent Oil: "BZ=F" | Natural Gas: "NG=F"
  * Bitcoin: "BTC-USD" | Ethereum: "ETH-USD" | Solana: "SOL-USD"
  * ETFs: use their actual ticker (e.g. "VAS.AX", "SPY", "QQQ")
  * FX/Currency: use Yahoo format (e.g. "AUDUSD=X", "EURUSD=X")
  * null ONLY if truly unlisted (private equity, term deposits, etc.)
- quantity: number of shares/units/ounces/coins. null for cash balances or if unavailable.
- valuation_base: the TOTAL market value of the entire position as a number (no currency symbols, no commas). This must be the full position value, NOT the per-unit price. For example, 50 ounces of gold at $2,300/oz → valuation_base = 115000, NOT 2300.
- valuation_date: ISO date "YYYY-MM-DD" from the document. Use today if unclear.
- currency: 3-letter currency code (e.g. "AUD", "USD")
- is_static: true

CRITICAL VALUATION RULES:
- valuation_base is ALWAYS the TOTAL position value (quantity × per-unit price), never the per-unit price alone.
- For commodities (gold, silver, oil): quantity = number of ounces/barrels, valuation_base = total value of all ounces/barrels combined.
- For equities: quantity = number of shares, valuation_base = total market value of all shares.
- For cash balances: valuation_base = the cash amount, quantity = null.
- SANITY CHECK: If the document states a total value for a line item, use that stated total directly. Do NOT recompute it — the document's total is authoritative.
- If quantity × per-unit price disagrees with the document's stated total, use the document's stated total for valuation_base.

Extract EVERY holding. Include cash balances as asset_class "Cash". Include managed funds, ETFs, commodities, crypto, and currency positions. If you cannot extract structured data, return an empty array [].`;

/**
 * Build content blocks for the Claude API from a file buffer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildContentBlocks(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): any[] {
  const base64 = Buffer.from(buffer).toString('base64');

  if (isPdf(mimeType) || isPdf(fileName)) {
    return [{
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    }];
  }

  if (isImage(mimeType) || isImage(fileName)) {
    return [{
      type: 'image',
      source: { type: 'base64', media_type: mimeType || 'image/png', data: base64 },
    }];
  }

  // Text/CSV/XLSX fallback
  const text = new TextDecoder('utf-8').decode(buffer);
  return [{
    type: 'text',
    text: `FILE: ${fileName}\n\n${text.slice(0, 100_000)}`,
  }];
}

export interface ExtractionResult {
  holdings: ValidationResult['valid'];
  warnings: string[];
  dropped: number;
  rawText: string;
}

/**
 * Extract holdings from a file buffer using Claude (non-streaming).
 * Used by the re-extract endpoint. The upload route still streams directly.
 */
export async function extractHoldingsFromBuffer(params: {
  buffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
  portfolioName?: string;
  description?: string;
}): Promise<ExtractionResult> {
  const anthropic = getAnthropicClient();

  const contentBlocks = buildContentBlocks(params.buffer, params.fileName, params.mimeType);

  const contextParts = [EXTRACTION_PROMPT];
  if (params.description) contextParts.push(`\nUSER DESCRIPTION: ${params.description}`);
  if (params.portfolioName) contextParts.push(`\nPORTFOLIO/SOURCE NAME: ${params.portfolioName}`);
  contentBlocks.push({ type: 'text', text: contextParts.join('') });

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 16384,
    messages: [{ role: 'user', content: contentBlocks }],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawText = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text as string)
    .join('');

  // Parse JSON from response
  const cleaned = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) {
    return { holdings: [], warnings: ['No JSON array found in response'], dropped: 0, rawText };
  }

  const rawHoldings = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as unknown[];
  if (!Array.isArray(rawHoldings)) {
    return { holdings: [], warnings: ['Response was not an array'], dropped: 0, rawText };
  }

  const { valid, warnings, dropped } = validateAndNormalizeHoldings(rawHoldings, params.portfolioName);
  return { holdings: valid, warnings, dropped, rawText };
}
