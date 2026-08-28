# Erreur « mauvaise clé » Play Console

Play Console attend la **première clé** utilisée lors du 1er upload.
Chaque build GitHub en générait une **nouvelle** → rejet.

## Solution rapide (app jamais publiée)

1. Play Console → **Paramètres** (engrenage) → **Paramètres avancés**
2. **Supprimer l'application** (Delete app)
3. Recrée l'app : nom `AYEBA`, package `app.ayeba.mobile`
4. Attends le prochain build GitHub (API 35 + clé fixe)
5. Upload le nouveau `app-release.aab`

## Garder la même clé à l'avenir

1. GitHub → repo **luka** → **Settings** → **Secrets and variables** → **Actions**
2. New secret : `AYEBA_KEYSTORE_BASE64`
   - Valeur : contenu du fichier `ayeba-upload.keystore` encodé en base64
3. (Optionnel) `AYEBA_KEYSTORE_PASS` = `ayeba2026`

Télécharger le keystore une fois :
- Actions → dernier build → artifact **SAVE-upload-keystore**

Encoder en base64 (PowerShell) :
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ayeba-upload.keystore"))
```

## Alternative (sans supprimer l'app)

Play Console → **Intégrité de l'app** → **Signature d'application**
→ **Demander la réinitialisation de la clé de téléchargement**

(Peut prendre 1–2 jours.)
