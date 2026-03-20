/**
 * Test script: Signs up a user and logs exactly what Supabase returns.
 *
 * Usage:
 *   npx tsx scripts/test-auth-email.ts
 *
 * Set these env vars (or they'll be read from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   NEXT_PUBLIC_SITE_URL         (your Railway URL, e.g. https://xxx.up.railway.app)
 *   TEST_EMAIL                   (email to sign up with)
 *   TEST_PASSWORD                (password, min 6 chars)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'test123456';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

if (!TEST_EMAIL) {
  console.error('Set TEST_EMAIL env var (e.g. TEST_EMAIL=you@gmail.com npx tsx scripts/test-auth-email.ts)');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

  const redirectTo = `${SITE_URL}/auth/callback?next=/onboard`;

  console.log('=== Auth Email Test ===');
  console.log('Supabase URL:  ', SUPABASE_URL);
  console.log('Site URL:      ', SITE_URL);
  console.log('Redirect To:   ', redirectTo);
  console.log('Test Email:    ', TEST_EMAIL);
  console.log('');

  console.log('1. Attempting signUp...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (signUpError) {
    console.error('   SIGN UP ERROR:', signUpError.message);
    console.error('   Status:', signUpError.status);

    if (signUpError.message.includes('already registered')) {
      console.log('');
      console.log('2. User exists. Trying resend...');
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: TEST_EMAIL,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (resendError) {
        console.error('   RESEND ERROR:', resendError.message);
        if (resendError.message.includes('rate')) {
          console.log('');
          console.log('   ^ This is the Supabase rate limit. You need custom SMTP.');
        }
      } else {
        console.log('   Resend successful! Check your inbox.');
      }
    }
  } else {
    console.log('   Sign up response:');
    console.log('   User ID:    ', signUpData.user?.id);
    console.log('   Email:      ', signUpData.user?.email);
    console.log('   Confirmed:  ', signUpData.user?.confirmed_at ? 'YES' : 'NO (check email)');
    console.log('   Session:    ', signUpData.session ? 'YES (email confirmation disabled)' : 'NO (email confirmation enabled)');

    if (signUpData.session) {
      console.log('');
      console.log('   Email confirmation is DISABLED in your Supabase project.');
      console.log('   User was signed in immediately — no email sent.');
      console.log('   The app would redirect to /onboard directly.');
    } else {
      console.log('');
      console.log('   Email confirmation is ENABLED.');
      console.log('   Check your inbox for the confirmation email.');
      console.log('   The link in the email should point to:');
      console.log(`   ${SITE_URL}/auth/callback?next=/onboard`);
      console.log('');
      console.log('   If it points to localhost instead, your Supabase');
      console.log('   dashboard "Site URL" is wrong. Fix it at:');
      console.log('   Dashboard → Project Settings → Authentication → URL Configuration');
    }
  }

  console.log('');
  console.log('=== Done ===');
}

main().catch(console.error);
