# Deployment

## Railway

1. Push this repo to GitHub (see below).
2. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub repo** → select the repo.
3. Railway will detect Next.js and use `npm run build` and `npm start`. No extra config needed.
4. Add **Variables** in the Railway project (or in the service):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (cron, ingest webhook) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `ANTHROPIC_MODEL` | No | Default `claude-opus-4-6` |
| `RESEND_API_KEY` | Yes | Resend API key |
| `BRIEFING_FROM_EMAIL` | Yes | Sender email (e.g. from Resend domain) |
| `CRON_SECRET` | Yes | Secret for `/api/cron/daily-briefing` (e.g. random string) |
| `VAULT_EMAIL_DOMAIN` | No | Default `vault.wealthdelta.com` (your inbound email domain) |
| `INGEST_WEBHOOK_SECRET` | Yes | Secret for `/api/ingest/email` webhook auth |

5. **Cron (daily briefing):** Railway doesn’t run Vercel-style crons. Use [Railway Cron](https://docs.railway.app/guides/scheduled-tasks) or an external cron (e.g. cron-job.org) to call:
   ```text
   GET https://your-app.up.railway.app/api/cron/daily-briefing
   Authorization: Bearer <CRON_SECRET>
   ```
   Schedule at 6:00 UTC (or your preferred time).

6. **SendGrid (optional):** If you use SendGrid Inbound Parse for vault email, set the webhook URL to `https://your-app.up.railway.app/api/ingest/email` and send the same `Authorization: Bearer <INGEST_WEBHOOK_SECRET>` header if your provider supports it (or use the query/auth method your provider offers).

7. Deploy. Railway will build and serve the app; use the generated URL or attach a custom domain.

## Vercel (alternative)

Same env vars. Cron is built-in via `vercel.json` (`0 6 * * *` for daily briefing).
