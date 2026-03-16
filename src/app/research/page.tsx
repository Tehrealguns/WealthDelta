import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResearchContent } from '@/components/research-content';

export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  return <ResearchContent />;
}
