import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PortfolioAnalytics } from '@/components/portfolio-analytics';
import type { HoldingRow, DailySnapshotRow } from '@/lib/types';

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const [{ data: holdings }, { data: snapshots }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .order('source', { ascending: true })
      .order('asset_class', { ascending: true }),
    supabase
      .from('daily_snapshots')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('snapshot_date', { ascending: false })
      .limit(30),
  ]);

  return (
    <PortfolioAnalytics
      holdings={(holdings as HoldingRow[]) ?? []}
      snapshots={(snapshots as DailySnapshotRow[]) ?? []}
    />
  );
}
