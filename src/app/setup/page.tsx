import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SetupWizard } from '@/components/setup-wizard';

export default async function SetupPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const { count } = await supabase
    .from('holdings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id);

  return (
    <SetupWizard
      userEmail={userData.user.email ?? ''}
      hasExistingHoldings={(count ?? 0) > 0}
    />
  );
}
