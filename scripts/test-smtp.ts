/**
 * Test SMTP connection and send a test email.
 *
 * Usage:
 *   npx tsx scripts/test-smtp.ts
 */

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM = process.env.BRIEFING_FROM_EMAIL || SMTP_USER;

async function main() {
  console.log('=== SMTP Test ===');
  console.log('Host:  ', SMTP_HOST);
  console.log('Port:  ', SMTP_PORT);
  console.log('User:  ', SMTP_USER || '(NOT SET)');
  console.log('Pass:  ', SMTP_PASS ? `${SMTP_PASS.slice(0, 4)}...` : '(NOT SET)');
  console.log('From:  ', FROM);
  console.log('');

  if (!SMTP_USER || !SMTP_PASS) {
    console.error('Set SMTP_USER and SMTP_PASS env vars');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  console.log('1. Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('   SUCCESS — SMTP connection verified');
  } catch (err) {
    console.error('   FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('');
  console.log(`2. Sending test email to ${SMTP_USER}...`);
  try {
    const info = await transporter.sendMail({
      from: `WealthDelta <${FROM}>`,
      to: SMTP_USER,
      subject: 'WealthDelta SMTP Test',
      html: '<h2>SMTP is working!</h2><p>If you see this, your briefing emails will send correctly.</p>',
    });
    console.log('   SUCCESS — Message ID:', info.messageId);
    console.log('   Check your inbox!');
  } catch (err) {
    console.error('   FAILED:', err instanceof Error ? err.message : err);
  }

  console.log('');
  console.log('=== Done ===');
}

main().catch(console.error);
