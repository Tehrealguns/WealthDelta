import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BriefingSettings } from '@/components/briefing-settings';

interface UserSettings {
  id: string;
  custom_instructions: string;
  watch_items: string;
  email_enabled: boolean;
  email_time: string;
  include_pdf: boolean;
}

interface BriefingRow {
  id: string;
  briefing_date: string;
  summary_text: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model: string | null;
  created_at: string;
}

export default async function BriefingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const userId = userData.user.id;

  const { data: existingSettings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!existingSettings) {
    await supabase.from('user_settings').insert({ user_id: userId });
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: briefings } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .order('briefing_date', { ascending: false })
    .limit(10);

  return (
    <BriefingSettings
      settings={(settings as UserSettings) ?? {
        id: '',
        custom_instructions: '',
        watch_items: '',
        email_enabled: true,
        email_time: '07:00',
        include_pdf: true,
      }}
      briefings={(briefings as BriefingRow[]) ?? []}
      userEmail={userData.user.email ?? ''}
    />
  );
}
