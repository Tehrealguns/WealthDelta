import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toDecimal, Decimal } from '@/lib/decimal';
import { enrichHoldings } from '@/lib/market-data';
import type { Source, AssetClass, SnapshotBreakdown } from '@/lib/types';

export async function POST() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = userData.user.id;
  const today = new Date().toISOString().split('T')[0];

  const { data: holdings, error: hErr } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId);

  if (hErr || !holdings?.length) {
    return NextResponse.json(
      { error: 'No holdings found', details: hErr?.message ?? 'Seed data first' },
      { status: 404 },
    );
  }

  const enriched = await enrichHoldings(holdings);

  let totalValue = toDecimal(0);
  const bySource: Record<string, Decimal> = {};
  const byClass: Record<string, Decimal> = {};

  for (let i = 0; i < holdings.length; i++) {
    const h = holdings[i];
    const e = enriched[i];
    const val = toDecimal(e.live_value_aud ?? e.live_value ?? h.valuation_base);
    totalValue = totalValue.plus(val);

    bySource[h.source] = (bySource[h.source] ?? toDecimal(0)).plus(val);
    byClass[h.asset_class] = (byClass[h.asset_class] ?? toDecimal(0)).plus(val);
  }

  const breakdown: SnapshotBreakdown = {
    by_source: Object.fromEntries(
      Object.entries(bySource).map(([k, v]) => [k, v.toNumber()]),
    ) as Record<Source, number>,
    by_class: Object.fromEntries(
      Object.entries(byClass).map(([k, v]) => [k, v.toNumber()]),
    ) as Record<AssetClass, number>,
  };

  const { data: prevSnapshot } = await supabase
    .from('daily_snapshots')
    .select('total_value')
    .eq('user_id', userId)
    .lt('snapshot_date', today)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  let deltaValue: number | null = null;
  let deltaPct: number | null = null;

  if (prevSnapshot) {
    const prevVal = toDecimal(prevSnapshot.total_value);
    deltaValue = totalValue.minus(prevVal).toNumber();
    deltaPct = prevVal.isZero()
      ? null
      : totalValue.minus(prevVal).div(prevVal).times(100).toDecimalPlaces(4).toNumber();
  }

  const { data: snapshot, error: sErr } = await supabase
    .from('daily_snapshots')
    .upsert(
      {
        user_id: userId,
        snapshot_date: today,
        total_value: totalValue.toNumber(),
        delta_value: deltaValue,
        delta_pct: deltaPct,
        breakdown_json: breakdown,
      },
      { onConflict: 'user_id,snapshot_date' },
    )
    .select()
    .single();

  if (sErr) {
    return NextResponse.json(
      { error: 'Failed to save snapshot', details: sErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: 'Snapshot generated',
    snapshot,
  });
}
