# WealthDelta

High-net-worth daily portfolio summarizer. Aggregates holdings from any bank (PDF upload + email forwarding) into one dashboard and a daily AI briefing email.

- **Stack:** Next.js 15, Supabase (auth + Postgres), Anthropic Claude, Resend, Tailwind, shadcn-style UI.
- **Data:** PDF extraction (vault/setup) + inbound email parsing; no bank API keys required.
- **See:** [SPEC.md](./SPEC.md) for schema and phases. [DEPLOY.md](./DEPLOY.md) for Railway/Vercel and env vars.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up → upload statements on `/setup` → dashboard + optional vault email for ongoing updates.

## Deploy

- **Railway:** See [DEPLOY.md](./DEPLOY.md) for env vars and cron setup.
- **Vercel:** Same env vars; cron in `vercel.json`.
