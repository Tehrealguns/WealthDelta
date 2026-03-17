import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardWizard } from '@/components/onboard-wizard';

export default async function OnboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const { data: existingSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();

  return (
    <OnboardWizard
      userEmail={userData.user.email ?? ''}
      existingSettings={existingSettings}
    />
  );
}
