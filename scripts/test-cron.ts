/**
 * Test the daily briefing cron endpoint.
 *
 * Usage:
 *   npx tsx scripts/test-cron.ts
 *
 * Tests against production by default. Set BASE_URL to override.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://wealthdelta-production.up.railway.app';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function main() {
  const url = `${BASE_URL}/api/cron/daily-briefing`;

  console.log('=== Cron Endpoint Test ===');
  console.log('URL:         ', url);
  console.log('CRON_SECRET: ', CRON_SECRET ? `${CRON_SECRET.slice(0, 8)}...` : '(NOT SET)');
  console.log('');

  console.log('Calling endpoint...');
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Response: ${res.status} ${res.statusText} (${elapsed}s)`);
    console.log('');

    const body = await res.json();
    console.log(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('Request failed:', err instanceof Error ? err.message : err);
  }

  console.log('');
  console.log('=== Done ===');
}

main().catch(console.error);
