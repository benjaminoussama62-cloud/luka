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

OAuth (**obligatoire** pour Google / GitHub / Microsoft) :
1. Créer les apps OAuth (Google Cloud, GitHub OAuth App, Azure AD)
2. Redirect URIs **exactes** :
   - `https://ayeba.app/api/auth/google/callback`
   - `https://ayeba.app/api/auth/github/callback`
   - `https://ayeba.app/api/auth/microsoft/callback`
3. Vercel → Environment Variables (Production + Preview) :
   - `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (**ne pas** fixer `GOOGLE_REDIRECT_URI`)
   - `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET`
   - `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET` (+ optionnel `MICROSOFT_TENANT_ID=common`)
4. Redeploy après ajout des variables
5. Vérifier : `https://ayeba.app/api/auth/providers` → chaque `configured: true`

Raccourcis accueil (optionnel) :
- `NEXT_PUBLIC_SHORTCUT_JEMSA`
- `NEXT_PUBLIC_SHORTCUT_SOMBATEKA`
- `NEXT_PUBLIC_SHORTCUT_DEVALPHA1`
- `NEXT_PUBLIC_SHORTCUT_TALA`

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
