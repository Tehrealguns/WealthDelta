import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardContent } from '@/components/dashboard-content';
import type { HoldingRow } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const [{ data, error }, { data: settingsData }, { data: snapshots }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .order('source', { ascending: true })
      .order('asset_class', { ascending: true }),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userData.user.id)
      .single(),
    supabase
      .from('daily_snapshots')
      .select('snapshot_date, total_value')
      .eq('user_id', userData.user.id)
      .order('snapshot_date', { ascending: true })
      .limit(90),
  ]);

  const holdings: HoldingRow[] = !error && data ? (data as HoldingRow[]) : [];

  if (holdings.length === 0 && !settingsData) {
    redirect('/onboard');
  }

  if (holdings.length === 0) {
    redirect('/onboard');
  }

  const displayName = settingsData?.display_name
    || userData.user.email?.split('@')[0]
    || 'there';

  const snapshotHistory = (snapshots ?? []).map((s: { snapshot_date: string; total_value: number }) => ({
    date: s.snapshot_date,
    value: Number(s.total_value),
  }));

  return (
    <DashboardContent
      holdings={holdings}
      userEmail={userData.user.email ?? ''}
      displayName={displayName}
      snapshotHistory={snapshotHistory}
    />
  );
}
