/**
 * Next.js instrumentation hook — runs once when the server starts.
 *
 * On long-running hosts (Railway, Docker, etc.) this sets up a built-in
 * cron scheduler that fires the daily-briefing endpoint every hour,
 * removing the need for an external cron service.
 */
export async function register() {
  // Only run in the Node.js runtime (not Edge), and only in production
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET) {
    console.warn('[cron-scheduler] CRON_SECRET not set — skipping built-in scheduler');
    return;
  }

  const PORT = process.env.PORT || '3000';
  let lastFiredHour = -1;

  // Check every 30 seconds whether we've crossed a new hour boundary
  setInterval(async () => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();

    // Fire within the first 2 minutes of each hour, but only once per hour
    if (currentMinute > 1 || currentHour === lastFiredHour) return;
    lastFiredHour = currentHour;

    console.log(`[cron-scheduler] Triggering daily-briefing at ${now.toISOString()}`);

    try {
      const res = await fetch(
        `http://localhost:${PORT}/api/cron/daily-briefing`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${CRON_SECRET}` },
        },
      );
      const body = await res.json();
      console.log(`[cron-scheduler] Response ${res.status}:`, JSON.stringify(body));
    } catch (err) {
      console.error('[cron-scheduler] Failed to call cron endpoint:', err);
    }
  }, 30_000);

  console.log('[cron-scheduler] Built-in hourly scheduler started');
}
