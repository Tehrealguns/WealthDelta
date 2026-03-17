interface BankConfig {
  name: string;
  domains: string[];
  promptHints: string;
}

const BANKS: BankConfig[] = [
  {
    name: 'UBS',
    domains: ['ubs.com', 'ubs.ch'],
    promptHints: `This is a UBS wealth management statement. UBS typically reports:
- Portfolio valuations in AUD/USD/CHF with ISIN codes
- Asset classes: equities, fixed income, structured products, alternatives
- Market values with accrued interest for bonds
- Currency: look for the base currency in the header`,
  },
  {
    name: 'JBWere',
    domains: ['jbwere.com.au', 'nab.com.au'],
    promptHints: `This is a JBWere (NAB subsidiary) wealth management statement. JBWere typically reports:
- Australian equities with ASX tickers
- Managed funds with APIR codes
- Fixed interest and term deposits
- Currency: AUD
- Look for "Portfolio Valuation" or "Asset Summary" sections`,
  },
  {
    name: 'Stonehage',
    domains: ['stonehagefleming.com', 'shf.co.uk'],
    promptHints: `This is a Stonehage Fleming family office statement. They typically report:
- Multi-currency holdings across global markets
- Private equity and alternative investments
- Real estate and collectible valuations
- Look for "Portfolio Summary" or "Consolidated Statement"`,
  },
  {
    name: 'BellPotter',
    domains: ['bellpotter.com.au'],
    promptHints: `This is a Bell Potter Securities statement. Bell Potter typically reports:
- Australian equities with ASX codes
- Trade confirmations with contract notes
- Cash balances in trust accounts
- Currency: AUD
- Look for "Portfolio Valuation" or "Contract Note"`,
  },
  {
    name: 'Macquarie',
    domains: ['macquarie.com', 'macquarie.com.au'],
    promptHints: `This is a Macquarie wealth/banking statement. Macquarie typically reports:
- Wrap platform holdings with multiple fund managers
- Cash Management Account balances
- Currency: AUD
- Look for "Investment Portfolio" or "Account Summary"`,
  },
  {
    name: 'Morgan Stanley',
    domains: ['morganstanley.com', 'ms.com'],
    promptHints: `This is a Morgan Stanley wealth management statement. They typically report:
- Global equities, bonds, and structured products
- Multiple currency denominations
- Look for "Account Statement" or "Portfolio Holdings"`,
  },
  {
    name: 'CommSec',
    domains: ['commsec.com.au', 'cba.com.au'],
    promptHints: `This is a CommSec / Commonwealth Bank statement. They typically report:
- ASX equities and ETFs
- International shares via CommSec International
- Currency: AUD`,
  },
];

const BASE_PROMPT = `You are a financial data extraction engine. Extract ALL holdings/assets from this wealth statement PDF.

Return ONLY a JSON array. Each object must have exactly these fields:
- asset_id: a unique slug (lowercase, e.g. "ubs-eq-bhp-001")
- source: the bank/custodian name (e.g. "UBS", "JBWere", "BellPotter", "Stonehage", "Macquarie")
- asset_name: full name of the holding
- asset_class: one of "Equity", "Bond", "Cash", "Alternative", "Private Equity"
- ticker_symbol: the stock/ETF ticker for the exchange (e.g. "BHP.AX" for ASX, "AAPL" for NASDAQ, "MSFT" for NYSE). Use Yahoo Finance format. null if not a listed security.
- quantity: number of shares/units held (e.g. 1500, 250.5). null for cash balances or if not available.
- valuation_base: total market value in the statement's base currency (no currency symbols, no commas)
- valuation_date: ISO date "YYYY-MM-DD" from the statement date
- currency: 3-letter currency code (e.g. "AUD", "USD", "GBP", "CHF")
- is_static: true

Important:
- Extract EVERY holding, not just the top ones
- Include cash balances as asset_class "Cash" (quantity: null for cash)
- For equities/ETFs, ALWAYS extract the quantity (number of shares/units) — this is critical for live price tracking
- For bonds, include face value and market value (use market value for valuation_base)
- ticker_symbol must be in Yahoo Finance format: ASX stocks end in ".AX" (e.g. "BHP.AX"), London stocks end in ".L", etc.
- If a holding has no clear value, skip it
- If you cannot extract structured data, return an empty array []

Return ONLY the JSON array, no markdown, no explanation.`;

export function getBankPrompt(fileNameOrDomain: string): string {
  const lower = fileNameOrDomain.toLowerCase();

  const matchedBank = BANKS.find((bank) =>
    bank.domains.some((domain) => lower.includes(domain)) ||
    lower.includes(bank.name.toLowerCase()),
  );

  if (matchedBank) {
    return `${BASE_PROMPT}\n\nBANK-SPECIFIC CONTEXT:\n${matchedBank.promptHints}`;
  }

  return BASE_PROMPT;
}

export function getBankFromEmail(fromAddress: string): BankConfig | null {
  const lower = fromAddress.toLowerCase();
  return BANKS.find((bank) =>
    bank.domains.some((domain) => lower.includes(domain)),
  ) ?? null;
}

export function getEmailParsePrompt(fromAddress: string): string {
  const bank = getBankFromEmail(fromAddress);

  const emailBase = `You are a financial email parser. Extract holdings, trades, or portfolio changes from this email.

Return a JSON array where each object has:
- asset_id: unique slug (lowercase)
- source: the bank/custodian name
- asset_name: full name of the holding/security
- asset_class: one of "Equity", "Bond", "Cash", "Alternative", "Private Equity"
- ticker_symbol: stock ticker if available, otherwise null
- valuation_base: value as a number (no currency symbols)
- valuation_date: ISO date "YYYY-MM-DD"
- is_static: true
- event_type: one of "buy", "sell", "dividend", "fee", "valuation", "other"

For SELL events, set valuation_base to 0.
For DIVIDEND events, include the amount and set asset_class to "Cash".
If no financial data, return [].
Return ONLY the JSON array.`;

  if (bank) {
    return `${emailBase}\n\nThis email is from ${bank.name}.\n${bank.promptHints}`;
  }

  return emailBase;
}

export { BANKS, type BankConfig };
