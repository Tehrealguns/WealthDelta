import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsContent } from '@/components/settings-content';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect('/login');

  return <SettingsContent />;
}
