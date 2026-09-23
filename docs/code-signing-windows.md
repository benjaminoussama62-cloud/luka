# Signature du code — AYEBA Browser (Windows)

## État actuel

Le build 1.2.3 est signé avec un **certificat auto-signé** local
(`C:\Users\ADMIN\ayeba-codesign.pfx`, thumbprint `E0448AB0…`) :
- l'installateur et `AYEBA.exe` portent une signature « Ayeba » vérifiable
- **limite honnête** : Windows SmartScreen affichera toujours
  « éditeur inconnu » — un cert auto-signé n'est pas une autorité de confiance.

## Pour une signature reconnue par Windows

Il n'existe **pas de certificat de confiance gratuit**. Options réelles :

| Option | Coût | Remarque |
|---|---|---|
| **Azure Trusted Signing** | ~10 $/mois | Le moins cher + le plus simple (Microsoft valide l'organisation ; la réputation SmartScreen monte vite) |
| Certificat OV (Sectigo, DigiCert…) | ~100–400 $/an | Classique, réputation SmartScreen à construire |
| Certificat EV | ~300–700 $/an | Réputation SmartScreen immédiate |

## Configurer en CI (GitHub Actions)

Une fois le PFX obtenu :

```powershell
# Convertir le PFX en base64
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | Set-Clipboard
```

Puis GitHub → repo `luka` → *Settings → Secrets and variables → Actions* :

- `CSC_LINK` = la chaîne base64 du PFX
- `CSC_KEY_PASSWORD` = le mot de passe du PFX

Le workflow `browser-windows.yml` passe déjà ces variables à
electron-builder — le prochain tag `browser-v*` produira un installateur
signé automatiquement.

## Signature locale

electron-builder découvre automatiquement les certificats du magasin Windows
(`Cert:\CurrentUser\My`) — `npm run dist` signe déjà avec le cert « Ayeba »
local. Pour utiliser un PFX spécifique :

```powershell
$env:CSC_LINK = "C:\chemin\cert.pfx"
$env:CSC_KEY_PASSWORD = "motdepasse"
npm run dist
```
