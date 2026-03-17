import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { render } from '@react-email/components';
import { sendMail } from '@/lib/mailer';
import BriefingEmail from '@/emails/briefing-email';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json()) as {
    briefingId: string;
    content: string;
    toEmail: string;
  };

  const toEmail = body.toEmail || userData.user.email;

  if (!toEmail) {
    return NextResponse.json(
      { error: 'No recipient', details: 'No email address available' },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const html = await render(
      BriefingEmail({ briefingDate: today, content: body.content }),
    );

    await sendMail({
      to: toEmail,
      subject: `WealthDelta Daily Briefing — ${today}`,
      html,
    });

    return NextResponse.json({ message: 'Email sent' });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to send email', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
