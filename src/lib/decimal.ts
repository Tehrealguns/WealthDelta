import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function toDecimal(value: number | string): Decimal {
  return new Decimal(value);
}

export function formatCurrency(
  value: number | string | Decimal,
  currency: string = 'AUD',
): string {
  const num = new Decimal(value).toNumber();
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
