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

  const [{ data, error }, { data: settingsData }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .order('source', { ascending: true })
      .order('asset_class', { ascending: true }),
    supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userData.user.id)
      .single(),
  ]);

  const holdings: HoldingRow[] = !error && data ? (data as HoldingRow[]) : [];

  if (holdings.length === 0 && !settingsData) {
    redirect('/onboard');
  }

  if (holdings.length === 0) {
    redirect('/setup');
  }

  return <DashboardContent holdings={holdings} userEmail={userData.user.email ?? ''} />;
}
