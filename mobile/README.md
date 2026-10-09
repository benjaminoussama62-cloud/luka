# Ayeba Money — coquilles natives

Deux coquilles, une seule codebase : `ayeba.app/money` (PWA). Rien n'est
simulé — les apps chargent le vrai site en HTTPS, la sécurité vit côté serveur.

## Android — TWA (Bubblewrap)

Le projet Gradle généré vit dans `android-twa/twa-app/` (commité).
Prérequis : JDK 17 (`JAVA_HOME`) + Android SDK (`ANDROID_HOME`) avec
`platforms;android-36` et `build-tools;36.0.0`.

Signature — le keystore `android.keystore` (alias `ayeba-money`, RSA 2048)
n'est **jamais** commité ; son mot de passe est fourni par variables
d'environnement :

```bash
cd mobile/android-twa/twa-app
JAVA_HOME=... ANDROID_HOME=... \
KEYSTORE_FILE=../android.keystore \
KEYSTORE_PASSWORD=... KEY_ALIAS=ayeba-money KEY_PASSWORD=... \
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab
```

Fingerprint de signature : `keytool -list -v -keystore android.keystore`.
`/.well-known/assetlinks.json` publie l'association dès que
`ANDROID_PACKAGE_NAME=app.ayeba.money` et
`ANDROID_SHA256_FINGERPRINT=XX:XX:…` sont configurés en production.

Regénérer le projet si `twa-manifest.json` change (non interactif) :

```bash
node -e "const {TwaGenerator,TwaManifest}=require('@bubblewrap/core');
(async()=>{const m=await TwaManifest.fromFile('twa-manifest.json');
await new TwaGenerator().createTwaProject('twa-app',m,()=>{})})()"
```

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
