# Plan de reprise — Ayeba (Turso + Vercel)

## Couverture

| Couche | Mécanisme | Fréquence |
|---|---|---|
| Snapshots applicatifs | `/api/cron/backup` → table `backup_snapshots` (JSON gzip, 12 tables critiques) | Quotidien 02:00 UTC |
| Rétention | 30 jours dans la base | auto |
| Turso natif | Replicas + journal (selon plan Turso) | continu |

## Tables sauvegardées (irremplaçables)

`users`, `user_preferences`, `mail_accounts`, `admin_users`, `admin_sessions`,
`oauth_clients`, `developer_apps`, `developer_api_keys`, `studio_sites`,
`payment_intents`, `subscriptions`, `invoices`.

Exclues volontairement (reconstructibles) : `crawl_*`, `fts_*`, `mail_messages`,
sessions éphémères.

## Scénarios

### A. Table applicative corrompue / suppression accidentelle
```ts
// Dans une route admin ou via node + tsx
import { listBackups, restoreBackup } from "@/lib/backup";
listBackups();            // choisir l'id du snapshot
restoreBackup("bk-…");    // INSERT OR REPLACE — restaure les lignes
```

### B. Perte totale de la base Turso
1. Créer une nouvelle base : `turso db create ayeba-restore`
2. Exporter depuis une réplique ou le dernier snapshot :
   `turso db shell ayeba ".dump" > backup.sql` (si réplique vivante)
   ou restaurer via `restoreBackup()` après remise en ligne de l'app.
3. Repointer `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` dans Vercel → redeploy.
4. L'app recrée le schéma automatiquement (migrations idempotentes au boot).

### C. Vercel indisponible
- Le code est sur GitHub (`benjaminoussama62-cloud/luka`) — tout est
  reconstructible : `vercel deploy` ou autre hébergeur Node.
- Secrets : garder une copie chiffrée locale de `.env` (hors repo).

## RPO / RTO cibles

- **RPO** : 24 h (snapshot quotidien) — réduire à 6 h en passant le cron à
  `0 */6 * * *` si le volume le justifie.
- **RTO** : < 1 h (redeploy Vercel + restore snapshot).

## Vérification mensuelle

```
GET /api/cron/backup   (CRON_SECRET)   → force un snapshot + liste
```
Vérifier que `row_counts` reflète le volume attendu.
