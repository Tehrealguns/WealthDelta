import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VaultContent } from '@/components/vault-content';
import type { HoldingRow, VaultFileRow } from '@/lib/types';

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const [{ data: holdingsData }, { data: filesData }] = await Promise.all([
    supabase
      .from('holdings')
      .select('*')
      .eq('is_static', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('vault_files')
      .select('*')
      .order('created_at', { ascending: false }),
  ]);

  const staticHoldings: HoldingRow[] = (holdingsData as HoldingRow[]) ?? [];
  const vaultFiles: VaultFileRow[] = (filesData as VaultFileRow[]) ?? [];

  return <VaultContent staticHoldings={staticHoldings} vaultFiles={vaultFiles} />;
}
