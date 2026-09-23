# Ayeba Mail externe — activation SMTP + MX + SPF/DKIM/DMARC

Ayeba Mail gère déjà la livraison interne `@ayeba.app ↔ @ayeba.app`. Ce guide
active le mail **externe** (envoyer à Gmail/Outlook, recevoir de n'importe où)
avec des providers **gratuits** — aucun coût récurrent.

---

## 1. ENVOI — relais SMTP (gratuit)

Option recommandée : **Brevo** (ex-Sendinblue) — 300 mails/jour gratuits,
parfait pour démarrer. Alternative : Gmail SMTP ou tout relais SMTP.

### Étapes Brevo
1. Créer un compte sur brevo.com (gratuit)
2. *SMTP & API → SMTP* → noter : serveur `smtp-relay.brevo.com`, port `587`,
   login + clé SMTP
3. Vérifier le domaine `ayeba.app` dans *Expéditeurs & Domaines* (ils donnent
   les enregistrements DKIM/SPF à ajouter au DNS — voir §3)
4. Variables à ajouter dans Vercel (`Project → Settings → Environment Variables`) :

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login brevo>
SMTP_PASS=<clé smtp brevo>
SMTP_FROM=noreply@ayeba.app
```

(Optionnel — signature DKIM côté app, si Brevo ne signe pas) :

```
DKIM_DOMAIN=ayeba.app
DKIM_SELECTOR=ayeba
DKIM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----"
```

Le code (`src/lib/mail/smtp.ts`) s'active automatiquement dès que
`SMTP_HOST+USER+PASS` existent. Sans ces variables : bounce honnête
« relais SMTP non configuré » — jamais de simulation.

### Alternative Gmail SMTP
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<votre-compte>@gmail.com
SMTP_PASS=<mot de passe d'application Google>
SMTP_FROM=<votre-compte>@gmail.com
```

---

## 2. RÉCEPTION — Cloudflare Email Routing (gratuit, illimité)

Cloudflare Email Routing + Email Worker → webhook Ayeba. **Gratuit, illimité.**

### DNS (dashboard Cloudflare → ayeba.app → Email Routing)
Activer *Email Routing* ajoute automatiquement les MX requis :

```
MX  ayeba.app  →  route1.mx.cloudflare.net  (prio 55)
MX  ayeba.app  →  route2.mx.cloudflare.net  (prio 68)
MX  ayeba.app  →  route3.mx.cloudflare.net  (prio 83)
TXT ayeba.app  →  "v=spf1 include:_spf.mx.cloudflare.net ~all"  (à fusionner, §3)
```

### Worker
1. Cloudflare → *Email → Email Routing → Email Workers → Create*
2. Coller le contenu de `docs/cloudflare-email-worker.js`
3. Dépendance `postal-mime` : `wrangler.toml` minimal :

```toml
name = "ayeba-mail-inbound"
main = "worker.js"
compatibility_date = "2024-09-01"
[vars]
MAIL_INBOUND_SECRET = "<le même secret que dans Vercel>"
```

(`postal-mime` s'installe via `npm i postal-mime` dans le dossier du worker —
ou utiliser le mode "Custom address → Worker" sans dépendance en forwardant le
RAW via `message.forward()` vers une adresse de fallback.)

4. Variable Vercel correspondante :
```
MAIL_INBOUND_SECRET=<secret long aléatoire, ex. 48 hex>
```
5. *Email Routing → Routes* : action = le Worker, pour `*@ayeba.app`
   (catch-all) ou par adresse.

Le Worker parse le MIME et POSTe vers `/api/mail/inbound` — sécurisé par
`x-inbound-secret` (comparaison timing-safe côté serveur).

---

## 3. DNS — SPF / DKIM / DMARC (déliverabilité)

Dans le DNS de `ayeba.app` (registrar ou Cloudflare) :

| Type | Nom | Valeur |
|---|---|---|
| TXT | `ayeba.app` | `v=spf1 include:spf.brevo.com include:_spf.mx.cloudflare.net ~all` |
| TXT | `ayeba._domainkey` (ou celui donné par Brevo) | clé publique DKIM fournie par le provider |
| TXT | `_dmarc.ayeba.app` | `v=DMARC1; p=quarantine; rua=mailto:postmaster@ayeba.app; fo=1` |

- `p=quarantine` au début → passer à `p=reject` quand tout est stable.
- Brevo génère ses propres enregistrements DKIM dans *Domaines* — les copier
  tels quels (deux TXT `mail._domainkey` etc.).
- Si DKIM app-level configuré (vars `DKIM_*`), publier la **clé publique**
  correspondante : `v=DKIM1; k=rsa; p=<pubkey>` sur `ayeba._domainkey`.

---

## 4. Vérification

```
# SMTP (diag back-office)
GET /api/admin/mail-health → appelle verifySmtp()

# Envoi test : depuis Ayeba Mail → votre Gmail perso
# Réception test : depuis Gmail → benjaminoussama@ayeba.app
#   (arrive en inbox via le Worker + webhook)
```

## 5. Limites honnêtes

- Brevo gratuit : 300 mails/jour — suffisant au lancement, à upgrader plus tard.
- Cloudflare Email Routing : réception illimitée, mais **pas d'envoi** — d'où
  le relais SMTP séparé.
- Pièces jointes : à implémenter en Phase suivante (le webhook accepte déjà
  text+html ; les PJ nécessitent un stockage objet — R2 gratuit 10 Go).
