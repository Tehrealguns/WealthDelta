import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toDecimal } from '@/lib/decimal';
import { enrichHoldings, holdingValueAud } from '@/lib/market-data';

export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: holdings, error: hErr } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userData.user.id);

  if (hErr || !holdings?.length) {
    return NextResponse.json(
      { error: 'No holdings found', details: hErr?.message },
      { status: 404 },
    );
  }

  const enriched = await enrichHoldings(holdings);

  let totalValue = toDecimal(0);
  const items: {
    asset_name: string;
    source: string;
    ticker: string | null;
    quantity: number | null;
    currency: string | null;
    asset_class: string;
    base_value: number;
    live_price: number | null;
    live_value_aud: number | null;
    effective_value: number;
    price_currency: string | null;
    fx_rate: number | null;
    fx_failed: boolean;
    stale: boolean;
    stale_reason: string | null;
    day_change_pct: number | null;
  }[] = [];

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const effective = holdingValueAud(h, e);
    totalValue = totalValue.plus(toDecimal(effective));

    items.push({
      asset_name: h.asset_name,
      source: h.source,
      ticker: h.ticker_symbol,
      quantity: h.quantity,
      currency: h.currency,
      asset_class: h.asset_class,
      base_value: h.valuation_base,
      live_price: e.live_price,
      live_value_aud: e.live_value_aud,
      effective_value: effective,
      price_currency: e.price_currency,
      fx_rate: e.fx_rate_to_aud,
      fx_failed: e.fx_failed,
      stale: e.stale,
      stale_reason: e.stale
        ? !h.ticker_symbol
          ? 'no ticker'
          : !h.quantity
            ? 'no quantity'
            : 'no quote from Yahoo'
        : null,
      day_change_pct: e.day_change_pct,
    });
  }

  const staleCount = items.filter((i) => i.stale).length;
  const fxFailCount = items.filter((i) => i.fx_failed).length;
  const warnings: string[] = [];
  if (staleCount > 0) warnings.push(`${staleCount} holdings have no live price`);
  if (fxFailCount > 0) warnings.push(`${fxFailCount} holdings have failed FX conversion`);

  // Sort by effective value descending
  items.sort((a, b) => b.effective_value - a.effective_value);

  return NextResponse.json({
    total_value: totalValue.toNumber(),
    holdings_count: holdings.length,
    stale_count: staleCount,
    fx_fail_count: fxFailCount,
    warnings,
    items,
  });
}
