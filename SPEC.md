# PRD: WealthDelta — High-Net-Worth Daily Summarizer

## 1. Project Overview & Objective

WealthDelta is a digital "Family Office" dashboard. It aggregates fragmented wealth from API-enabled banks (UBS, JBWere) and API-less platforms (Stonehage Fleming, Bell Potter) into a unified daily briefing and a deep-research PDF.

**Primary Goal:** Deliver a daily narrative "Daily Briefing" via email that explains *why* wealth changed, powered by Claude 4.6 Opus.

---

## 2. Technical Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Strict TypeScript) |
| Database / Auth | Supabase (PostgreSQL, Row Level Security) |
| Aggregator — Banks | Flanks API (UBS, JBWere portfolios) |
| Aggregator — Trades | Sharesight API (Bell Potter trade-tracking) |
| Document AI | Unstract or Parsio (PDF-to-JSON extraction) |
| Intelligence | Anthropic Claude 4.6 Opus (API, Prompt Caching) |
| Email | Resend (React Email templates) |
| UI Components | shadcn/ui + Tailwind CSS |
| Financial Math | decimal.js (never use native `number`) |

---

## 3. Data Schema (Source of Truth)

> **DO NOT DEVIATE** from this schema. All sources must map to this object.

```typescript
interface UnifiedPortfolio {
  asset_id: string;                // Unique ID (UUID v4)
  source: 'UBS' | 'Stonehage' | 'JBWere' | 'BellPotter';
  asset_name: string;
  asset_class: 'Equity' | 'Bond' | 'Cash' | 'Alternative' | 'Private Equity';
  ticker_symbol: string | null;    // For public assets only
  valuation_base: number;          // Current value in USD/AUD — stored as decimal in DB
  valuation_date: string;          // ISO 8601 date (YYYY-MM-DD)
  is_static: boolean;              // True for PDF-only assets (e.g. Stonehage)
}
```

### Supabase Tables

#### `holdings`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users`, NOT NULL |
| `asset_id` | text | UNIQUE per user, NOT NULL |
| `source` | text | CHECK IN ('UBS','Stonehage','JBWere','BellPotter') |
| `asset_name` | text | NOT NULL |
| `asset_class` | text | CHECK IN ('Equity','Bond','Cash','Alternative','Private Equity') |
| `ticker_symbol` | text | NULLABLE |
| `valuation_base` | numeric | NOT NULL, precision 18,4 |
| `valuation_date` | date | NOT NULL |
| `is_static` | boolean | DEFAULT false |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | DEFAULT now() |

#### `daily_snapshots`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users`, NOT NULL |
| `snapshot_date` | date | NOT NULL |
| `total_value` | numeric | NOT NULL, precision 18,4 |
| `delta_value` | numeric | precision 18,4 |
| `delta_pct` | numeric | precision 8,4 |
| `breakdown_json` | jsonb | Per-source and per-class totals |
| `created_at` | timestamptz | DEFAULT now() |

> RLS policies: Every row scoped to `auth.uid() = user_id`.

---

## 4. Implementation Phases

### Phase 1: Foundation & Static Mirroring

**Goal:** Supabase schema + mock-data loader + holdings table UI.

**Tasks:**

1. Initialize Next.js 15 project with App Router and strict TypeScript (`strict: true`).
2. Install and configure Supabase client (`@supabase/supabase-js`, `@supabase/ssr`).
3. Create Supabase migrations for `holdings` and `daily_snapshots` tables with RLS.
4. Create `mock_bank_data.json` with representative sample holdings across all four sources.
5. Build a `/api/seed` route that loads mock data into Supabase.
6. Build a `/dashboard` page rendering holdings in a shadcn/ui DataTable with sorting and filtering by source and asset class.

**Acceptance Criteria:**

- [ ] `holdings` and `daily_snapshots` tables exist with correct constraints.
- [ ] `mock_bank_data.json` can be uploaded and all rows appear in the DataTable.
- [ ] RLS enforced — unauthenticated requests return zero rows.

---

### Phase 2: PDF Ingestion ("The Vault")

**Goal:** Upload a wealth-statement PDF → extract → map to `UnifiedPortfolio` → persist.

**Tasks:**

1. Create a Supabase Storage bucket `vault` with authenticated-only access.
2. Build a `/vault` page with a drag-and-drop upload zone (shadcn/ui).
3. Create a Supabase Edge Function `process-vault-pdf`:
   - Receives the storage object path.
   - Sends the PDF to the Unstract API (or Parsio fallback).
   - Maps the returned JSON to `UnifiedPortfolio`.
   - Upserts rows into `holdings` with `is_static = true`.
4. Display extraction status and parsed holdings inline on the `/vault` page.

**Acceptance Criteria:**

- [ ] A sample Stonehage Fleming PDF is uploaded and its assets appear in `holdings`.
- [ ] Duplicate uploads upsert (do not create duplicates).
- [ ] Extraction errors surface a clear toast notification.

---

### Phase 3: The Opus Intelligence Layer

**Goal:** Automated daily narrative generation.

**Tasks:**

1. Create a `/api/briefing/generate` route:
   - Fetch `Snapshot(T)` and `Snapshot(T-1)` from `daily_snapshots`.
   - Compute deltas per source and per asset class using `decimal.js`.
   - Build the Claude prompt with PII-masked data.
   - Call Claude 4.6 Opus with Prompt Caching enabled (system prompt cached).
   - Store the response in a new `briefings` table.
2. Create a `/briefing` page displaying the latest narrative.
3. Wire up Resend to email the briefing using a React Email template.

**Prompt Contract (Claude):**

```text
<system>
You are a family-office CIO writing a daily portfolio briefing.
Rules: Be precise with numbers. Attribute every change to a source.
Never hallucinate holdings. If data is missing, say so.
</system>

<user>
## Portfolio Delta: {{snapshot_date}}
Previous Total: {{prev_total}}
Current Total: {{curr_total}}
Change: {{delta_value}} ({{delta_pct}}%)

### By Source
{{#each sources}}
- {{name}}: {{value}} ({{change}})
{{/each}}

### By Asset Class
{{#each classes}}
- {{name}}: {{value}} ({{change}})
{{/each}}

Write a 3-paragraph executive summary explaining the change.
</user>
```

**Acceptance Criteria:**

- [ ] Given two snapshots, the route returns a coherent 3-paragraph summary.
- [ ] PII (names, account numbers) is stripped before the API call.
- [ ] Prompt Caching header `anthropic-beta: prompt-caching-2024-07-31` is sent.

---

### Phase 4: Research PDF Generation

**Goal:** On-demand downloadable deep-research PDF.

**Tasks:**

1. Create a `/api/research/generate` route:
   - Sends a longer prompt to Claude requesting a "Deep Research" analysis (market context, risk flags, allocation recommendations).
   - Stores the markdown response.
2. Use `@react-pdf/renderer` to convert the markdown into a styled multi-page PDF.
3. Add a "Download Research PDF" button on `/briefing`.

**Acceptance Criteria:**

- [ ] PDF renders with branded header, table of contents, and formatted sections.
- [ ] File size < 2 MB for a typical report.
- [ ] Download works on desktop and mobile Safari.

---

## 5. Security & Constraints

| Constraint | Rule |
|---|---|
| PII Masking | Scrub all PII (names, account numbers, addresses) before sending data to Anthropic. |
| Decimal Precision | Use `decimal.js` for all financial arithmetic. Never use native `number` for money. |
| Prompt Caching | Use Anthropic Prompt Caching (`anthropic-beta` header) — ~90% cost reduction on repeated system prompts. |
| Row Level Security | Every Supabase table must have RLS policies scoped to `auth.uid()`. |
| Environment Secrets | All API keys in `.env.local`, never committed. `.env.example` with placeholder keys only. |
| Rate Limiting | API routes must implement rate limiting (e.g. Upstash Ratelimit or Supabase pg_net). |
| Error Boundaries | Every page wrapped in a React Error Boundary with user-friendly fallback. |

---

## 6. File Structure (Expected)

```
WealthDelta/
├── SPEC.md                          # This file
├── .cursorrules                     # Cursor agent instructions
├── .env.example                     # Placeholder env vars
├── next.config.ts
├── package.json
├── tsconfig.json
├── supabase/
│   └── migrations/
│       ├── 001_holdings.sql
│       └── 002_daily_snapshots.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── vault/
│   │   │   └── page.tsx
│   │   ├── briefing/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── seed/route.ts
│   │       ├── briefing/generate/route.ts
│   │       └── research/generate/route.ts
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives
│   │   ├── holdings-table.tsx
│   │   ├── vault-uploader.tsx
│   │   ├── briefing-card.tsx
│   │   └── error-boundary.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── anthropic.ts
│   │   ├── decimal.ts               # decimal.js helpers
│   │   ├── pii-masker.ts
│   │   └── types.ts                 # UnifiedPortfolio + all shared types
│   └── data/
│       └── mock_bank_data.json
└── emails/
    └── daily-briefing.tsx           # React Email template
```

---

## 7. Environment Variables

```env
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-4-opus-20260301

FLANKS_API_KEY=your-flanks-key
FLANKS_BASE_URL=https://api.flanks.io/v1

SHARESIGHT_CLIENT_ID=your-sharesight-id
SHARESIGHT_CLIENT_SECRET=your-sharesight-secret

UNSTRACT_API_KEY=your-unstract-key
UNSTRACT_BASE_URL=https://api.unstract.com/v1

RESEND_API_KEY=re_xxxxx
BRIEFING_FROM_EMAIL=briefing@yourdomain.com
BRIEFING_TO_EMAIL=you@yourdomain.com
```
