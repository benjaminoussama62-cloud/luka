# Production ops — AYEBA / ayeba.app

## Vercel env (Settings → Environment Variables)

Required:
- `NEXT_PUBLIC_SITE_URL=https://ayeba.app`
- `NEXT_PUBLIC_APP_URL=https://ayeba.app`
- `AUTH_SECRET` (32+ chars)
- `JWT_SECRET` (32+ chars, different)
- `CRON_SECRET` (random; used by cron + manual triggers)

Durable DB (required for real index / users / Ayebi):
1. Create DB at https://turso.tech
2. `TURSO_DATABASE_URL=libsql://….turso.io`
3. `TURSO_AUTH_TOKEN=…`

OAuth (optional until Connexion sociale):
- Google / GitHub / Microsoft client IDs + secrets
- Authorized redirect URIs:
  - `https://ayeba.app/api/auth/google/callback`
  - `https://ayeba.app/api/auth/github/callback`
  - `https://ayeba.app/api/auth/microsoft/callback`

## DNS

- Apex `ayeba.app` → Vercel CNAME (DNS only / grey cloud on Cloudflare)
- Optional `www` → same target; middleware redirects www → apex
- Cloudflare SSL: Full (strict)

## Crons (`vercel.json`)

- `/api/cron/crawl` — hourly
- `/api/cron/health` — every 15 min

Manual trigger:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://ayeba.app/api/cron/crawl
```

First fill (local machine → Turso, after `vercel env pull .env.local`):
```bash
npm run jobs:quick   # small batch
npm run jobs         # larger crawl + Ayebi chunk
```

## Checks

- https://ayeba.app
- https://ayeba.app/opensearch.xml
- https://ayeba.app/opensearch
- https://ayeba.app/status
- https://ayeba.app/privacy
- https://ayeba.app/api/index/stats
