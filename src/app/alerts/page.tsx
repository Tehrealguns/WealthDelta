import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlertsWatchlist } from '@/components/alerts-watchlist';
import type { HoldingRow } from '@/lib/types';

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const [{ data: holdings }, { data: settings }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .order('asset_name', { ascending: true }),
    supabase
      .from('user_settings')
      .select('watch_items')
      .eq('user_id', userData.user.id)
      .single(),
  ]);

  return (
    <AlertsWatchlist
      holdings={(holdings as HoldingRow[]) ?? []}
      watchItems={settings?.watch_items ?? ''}
    />
  );
}
