---
name: wealthdelta
description: >-
  Project conventions and architecture for WealthDelta, a high-net-worth daily
  portfolio summarizer. Use when editing any WealthDelta source file, adding
  features, fixing bugs, creating API routes, modifying the database schema,
  working with Supabase, Anthropic Claude, PDF extraction, email briefings,
  or the 3D landing page.
---

# WealthDelta Project Skill

## Architecture

Next.js 16 App Router with Supabase (PostgreSQL + RLS + Auth), Anthropic Claude for AI, SMTP for email, Yahoo Finance for live market data. Deployed on Railway.

### Source layout

```
src/app/           → Pages and API routes (App Router)
src/components/    → React components
src/lib/           → Shared utilities, clients, types
src/lib/supabase/  → Supabase client/server/middleware
src/lib/pdf/       → PDF generation (@react-pdf/renderer)
emails/            → React Email templates
supabase/migrations/ → SQL migration files
```

## Critical conventions

### Financial math

Always use `decimal.js` via `src/lib/decimal.ts`. Never use raw `number` for money.

```typescript
import { toDecimal, formatCurrency } from '@/lib/decimal';
const total = toDecimal(holding.valuation_base);
```

### Supabase

- All tables have Row Level Security (RLS) scoped to `auth.uid()`.
- Use `createClient()` from `src/lib/supabase/server.ts` in API routes.
- Use `createBrowserClient()` from `src/lib/supabase/client.ts` in client components.
- Service role key used only in cron/webhook routes.
- New tables require a migration file in `supabase/migrations/` with RLS policies.

### AI / Claude

- Client: `src/lib/anthropic.ts` — use `getAnthropicClient()` and `ANTHROPIC_MODEL`.
- Default model: `claude-opus-4-6` (set via `ANTHROPIC_MODEL` env var).
- PII masking: always run through `maskPII()` from `src/lib/pii-masker.ts` before sending portfolio data to Claude.
- PDF extraction: send full PDF as base64 `document` type. Use `max_tokens: 16384` for statements, `max_tokens: 4096` for briefings.
- Bank-specific prompts come from `src/lib/bank-registry.ts`.

### Styling

- Dark theme only (forced via `ThemeProvider`).
- Tailwind CSS 4 + shadcn/ui components in `src/components/ui/`.
- Fonts: Sora (sans), JetBrains Mono (mono).
- Card backgrounds: `bg-white/[0.03]` or `bg-[#0a0a0a]` with `border-white/[0.06]`.
- Text hierarchy: `text-white/80` headings, `text-white/40` body, `text-white/20` secondary.
- Use `framer-motion` for scroll animations. Use `lenis` for smooth scrolling on landing page.

### API routes

- Route handlers use `NextRequest`/`NextResponse`.
- Set `export const maxDuration = 300` on routes that call Claude.
- Auth pattern: `const supabase = await createClient(); const { data: userData } = await supabase.auth.getUser();`
- Cron routes verify `Authorization: Bearer <CRON_SECRET>`.
- Webhook routes verify `Authorization: Bearer <INGEST_WEBHOOK_SECRET>`.

### Email

- SMTP via `nodemailer` — see `src/lib/mailer.ts`.
- Templates in `emails/` using `@react-email/components`.
- Render templates with `render()` then pass HTML string to `sendMail()`.

## Database tables

| Table | Purpose |
|-------|---------|
| `holdings` | Unified portfolio holdings (all banks, all users). Unique on `(user_id, asset_id)`. |
| `daily_snapshots` | Daily portfolio totals + breakdown JSON. Unique on `(user_id, snapshot_date)`. |
| `briefings` | AI-generated daily summaries. Unique on `(user_id, briefing_date)`. |
| `user_settings` | Per-user prefs: custom instructions, watch items, email time, PDF toggle. |
| `bank_connections` | API bank connections (Basiq/Yodlee). |
| `vault_emails` | Unique vault email slugs per user. |
| `ingested_emails` | Processed inbound bank emails. |

## Data flow

1. **Upload**: User drops PDFs → `/api/setup/upload` → Claude extracts holdings → saved to `holdings` table.
2. **Snapshot**: `/api/snapshots/generate` → sums all holdings for user → saves to `daily_snapshots`.
3. **Briefing**: `/api/briefing/generate` → reads all holdings + snapshots + live market data → Claude writes summary → saved to `briefings`.
4. **Email**: `/api/briefing/send` → renders React Email template with briefing text → sends via SMTP with optional PDF attachment.
5. **Cron**: `/api/cron/daily-briefing` → runs steps 2-4 for all users with `email_enabled = true` at their preferred `email_time`.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Cron + webhooks only |
| `ANTHROPIC_API_KEY` | Yes | |
| `CRON_SECRET` | Yes | Bearer token for cron route |
| `SMTP_USER` | Yes | Gmail address or SMTP user |
| `SMTP_PASS` | Yes | App password |
| `SMTP_HOST` | No | Defaults to `smtp.gmail.com` |
| `SMTP_PORT` | No | Defaults to `587` |
| `BRIEFING_FROM_EMAIL` | No | Defaults to SMTP_USER |

## Key pages

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `landing-scene-3d.tsx` | 3D Canvas background + DOM content with framer-motion scroll animations. Falls back to 2D via `WebGLErrorBoundary`. |
| `/dashboard` | `dashboard-content.tsx` | Portfolio summary, charts (recharts), holdings table, settings dropdown. |
| `/setup` | `setup-wizard.tsx` | Multi-PDF drag-and-drop upload → sequential Claude extraction. |
| `/onboard` | `onboard-wizard.tsx` | Post-signup preferences (briefing time, custom instructions, watch items). |
| `/briefing` | `briefing-content.tsx` | View/generate daily briefing, customize instructions. |

## Adding a new bank

1. Add entry to `BANK_CONFIGS` in `src/lib/bank-registry.ts` with `domains`, `keywords`, and `extractionHints`.
2. The prompt template is shared — bank-specific hints guide Claude to find the right fields.
3. No migration needed unless adding new asset classes.

## Adding a new page

1. Create route at `src/app/<route>/page.tsx`.
2. Use one of the existing background components for consistency.
3. Add nav link in `src/components/app-nav.tsx`.
4. Gate behind auth: check `supabase.auth.getUser()` and redirect if unauthenticated.
