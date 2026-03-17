import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActivityTimeline } from '@/components/activity-timeline';
import type { DailySnapshotRow } from '@/lib/types';

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const [{ data: snapshots }, { data: briefings }, { data: ingested }] = await Promise.all([
    supabase
      .from('daily_snapshots')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('snapshot_date', { ascending: false })
      .limit(30),
    supabase
      .from('briefings')
      .select('id, briefing_date, summary_text, model, created_at')
      .eq('user_id', userData.user.id)
      .order('briefing_date', { ascending: false })
      .limit(20),
    supabase
      .from('ingested_emails')
      .select('id, from_address, subject, holdings_extracted, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <ActivityTimeline
      snapshots={(snapshots as DailySnapshotRow[]) ?? []}
      briefings={briefings ?? []}
      ingestedEmails={ingested ?? []}
    />
  );
}
