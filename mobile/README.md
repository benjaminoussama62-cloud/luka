# Ayeba Money — coquilles natives

Deux coquilles, une seule codebase : `ayeba.app/money` (PWA). Rien n'est
simulé — les apps chargent le vrai site en HTTPS, la sécurité vit côté serveur.

## Android — TWA (Bubblewrap)

```bash
npm i -g @bubblewrap/cli
cd mobile/android-twa
bubblewrap init --manifest ../android-twa/twa-manifest.json
bubblewrap build
```

Puis :

1. Signer l'APK/AAB avec le keystore de production.
2. Extraire le fingerprint : `keytool -list -v -keystore android.keystore`
3. Déployer avec `ANDROID_PACKAGE_NAME=app.ayeba.money` et
   `ANDROID_SHA256_FINGERPRINT=XX:XX:…` — `/.well-known/assetlinks.json`
   publie alors l'association automatiquement.

## iOS + Android — Capacitor

```bash
cd mobile
npm install
npx cap add ios && npx cap add android
npx cap sync
npx cap open ios     # Xcode → archive → App Store
```

Le contenu vient de `server.url` (config Capacitor) : mises à jour
instantanées sans re-soumission, sauf changement de permissions natives.

## Sécurité

- Aucune donnée bancaire stockée côté client ; `allowMixedContent=false`.
- Le service worker PWA ne cache jamais `/api/money/*`.
- PIN exigé à chaque mouvement ; biométrie locale (Face ID/empreinte)
  pourra déverrouiller le PIN — phase WebAuthn.
