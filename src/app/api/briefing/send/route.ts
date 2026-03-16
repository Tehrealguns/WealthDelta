import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import BriefingEmail from '@/emails/briefing-email';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 're_xxxxx') {
    return NextResponse.json(
      { error: 'Email not configured', details: 'Set RESEND_API_KEY in .env.local' },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    briefingId: string;
    content: string;
    toEmail: string;
  };

  const fromEmail = process.env.BRIEFING_FROM_EMAIL ?? 'briefing@wealthdelta.app';
  const toEmail = body.toEmail || process.env.BRIEFING_TO_EMAIL || userData.user.email;

  if (!toEmail) {
    return NextResponse.json(
      { error: 'No recipient', details: 'No email address available' },
      { status: 400 },
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `WealthDelta Daily Briefing — ${today}`,
    react: BriefingEmail({
      briefingDate: today,
      content: body.content,
    }),
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: 'Email sent',
    emailId: data?.id,
  });
}
