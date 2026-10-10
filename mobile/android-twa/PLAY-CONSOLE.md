# Ayeba Mbongo — Play Console (TWA)

App **TWA** qui ouvre `https://ayeba.app/money`. Package : `app.ayeba.mbongo` (définitif, jamais modifiable après upload).

## Écran « Créer une application »

| Champ | Valeur |
|-------|--------|
| **Nom de l'application** | `Ayeba Mbongo` |
| **Nom du package** | `app.ayeba.mbongo` |
| **Langue par défaut** | Français (France) |
| **Appli ou jeu** | **Appli** |
| **Gratuite ou payante** | **Sans frais** |
| **Déclarations** | cocher les 2 cases |

## Build AAB (GitHub Actions — pas de Java local)

1. Ajouter les secrets repo → GitHub → Settings → Secrets and variables → Actions :
   - `MBONGO_KEYSTORE_BASE64` = contenu de `mobile/android-twa/MBONGO_KEYSTORE_BASE64.txt` (supprimer le fichier après)
   - `MBONGO_KEYSTORE_PASS` = `AyebaMoney-c23835766ae9e1e73120` (alias interne : `ayeba-money`)
2. Push `mobile/android-twa/**` (ou Actions → « Build Ayeba Mbongo Android AAB » → Run workflow)
3. Artifact **AyebaMbongo-PlayStore-aab** → `app-release.aab` → upload Play Console

## Asset Links (obligatoire TWA — sinon barre d'URL visible)

- Vercel env `ANDROID_PACKAGE_NAME` = `app.ayeba.mbongo` + redeploy
- `ANDROID_SHA256_FINGERPRINT` inchangé : même keystore (`82:FF:A8:58:...`)
- Vérifier : `curl https://ayeba.app/.well-known/assetlinks.json` → `app.ayeba.mbongo`

## Test fermé 14 jours (compte perso)

- Min **12 testeurs opt-in en continu 14 jours** → viser 15-18 (emails Gmail)
- Le compteur démarre quand les testeurs rejoignent via le lien d'opt-in
- Après : Dashboard → « Demander l'accès à la production »
