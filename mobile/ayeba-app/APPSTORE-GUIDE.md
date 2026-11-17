# AYEBA iOS — Guide App Store Connect

## 1. Créer la fiche app

**App Store Connect → Mes apps → + → Nouvelle app**

| Champ | Valeur |
|---|---|
| Plateforme | iOS |
| Nom | AYEBA |
| Langue principale | Français |
| Bundle ID | `app.ayeba.mobile` (déjà dans le projet Xcode) |
| SKU | `ayeba-ios-001` |
| Accès utilisateur | Accès complet |

## 2. Build

- `MARKETING_VERSION` : 1.0.19 · `CURRENT_PROJECT_VERSION` : 20 — déjà dans `project.pbxproj`
- Workflow GitHub `ios-ipa.yml` (runner macOS) produit l'IPA non signé pour vérification compile.
- **Pour TestFlight/App Store** : signer nécessite dans Apple Developer Portal :
  1. App ID `app.ayeba.mobile`
  2. Certificat Distribution (`.p12`)
  3. Profil de provisionnement App Store
  → Puis `xcodebuild -exportArchive` avec `-exportOptionsPlist` (méthode `app-store-connect`) ou Xcode → Archive → Distribute App.

## 3. Métadonnées

- Nom : `AYEBA`
- Sous-titre (30) : `Recherche et navigateur`
- Mots-clés (100, séparés par des virgules, FR+EN) : `recherche,moteur,navigateur,search,engine,browser,ayeba,onglets,favoris`
- Texte promotionnel / description : `store/listing-fr.txt` (copie approuvée Play, adaptable iOS)
- URL confidentialité : `https://ayeba.app/privacy`
- URL assistance : `https://ayeba.app/support`
- Catégorie : Utilitaires (secondaire : Références)

## 4. Captures requises

- iPhone 6,7" / 6,9" : 3-10 captures — recherche, omnibox, vue onglets (vraies captures = le point fort façon Safari)
- iPad (si ciblé) : 13" — sinon décocher iPad dans la fiche

## 5. Conformité

- `ITSAppUsesNonExemptEncryption` = `false` déjà déclaré (HTTPS standard, exempt) → pas de formulaire export.
- **Chine** : les bandeaux AIGC/évaluation sécurité dans ta console ne concernent QUE la distribution en Chine continentale — soit tu complètes ces déclarations, soit tu exclues la Chine des territoires de distribution.
- Classification contenu : navigateur web → « Accès web illimité » = catégorie 17+ (standard navigateurs : Chrome/Safari idem).
- Confidentialité (nutrition labels) : historique/favoris **locaux uniquement** → « Données non collectées » pour la navigation ; seul le compte Ayeba facultatif collecte l'email.

## 6. État actuel du code

- Projet iOS : `mobile/ayeba-app/ios/` — plugin `AyebaBrowser` natif (WKWebView, captures onglets, onglets multiples) identique Android.
- Tout est committé ; `xcodebuild` requis (Mac) pour générer l'archive signée.
