import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ConnectionsContent } from '@/components/connections-content';
import crypto from 'crypto';

interface VaultEmail {
  email_slug: string;
  is_active: boolean;
}

interface IngestedEmail {
  id: string;
  from_address: string | null;
  subject: string | null;
  status: string;
  holdings_extracted: number;
  received_at: string;
}

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect('/login');
  }

  const userId = userData.user.id;

  let { data: vaultEmail } = await supabase
    .from('vault_emails')
    .select('email_slug, is_active')
    .eq('user_id', userId)
    .single();

  if (!vaultEmail) {
    const slug = crypto.randomBytes(6).toString('hex');
    await supabase.from('vault_emails').insert({
      user_id: userId,
      email_slug: slug,
    });
    vaultEmail = { email_slug: slug, is_active: true } as VaultEmail;
  }

  const { data: recentEmails } = await supabase
    .from('ingested_emails')
    .select('id, from_address, subject, status, holdings_extracted, received_at')
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
    .limit(20);

  const domain = process.env.VAULT_EMAIL_DOMAIN ?? 'vault.wealthdelta.com';

  return (
    <ConnectionsContent
      vaultEmail={`${(vaultEmail as VaultEmail).email_slug}@${domain}`}
      isActive={(vaultEmail as VaultEmail).is_active}
      recentEmails={(recentEmails as IngestedEmail[]) ?? []}
    />
  );
}
