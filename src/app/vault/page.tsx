import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VaultContent } from '@/components/vault-content';
import type { HoldingRow } from '@/lib/types';

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const { data } = await supabase
    .from('holdings')
    .select('*')
    .eq('is_static', true)
    .order('created_at', { ascending: false });

  const staticHoldings: HoldingRow[] = (data as HoldingRow[]) ?? [];

  return <VaultContent staticHoldings={staticHoldings} />;
}
