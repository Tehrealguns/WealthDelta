import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import mockData from '@/data/mock_bank_data.json';
import type { UnifiedPortfolio } from '@/lib/types';

export async function POST() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: 'Not authenticated', details: 'Sign in first' },
      { status: 401 },
    );
  }

  const userId = userData.user.id;

  const holdings = (mockData as UnifiedPortfolio[]).map((item) => ({
    user_id: userId,
    asset_id: item.asset_id,
    source: item.source,
    asset_name: item.asset_name,
    asset_class: item.asset_class,
    ticker_symbol: item.ticker_symbol,
    valuation_base: item.valuation_base,
    valuation_date: item.valuation_date,
    is_static: item.is_static,
  }));

  const { data, error } = await supabase
    .from('holdings')
    .upsert(holdings, { onConflict: 'user_id,asset_id' })
    .select();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to seed holdings', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Seeded ${data.length} holdings`,
    count: data.length,
  });
}
