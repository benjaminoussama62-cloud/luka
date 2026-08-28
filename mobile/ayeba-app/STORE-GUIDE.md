# AYEBA Mobile — Play Store & App Store (RDC)

Shell **Capacitor léger** (~12–15 Mo) : l’app charge `https://ayeba.app/?app=1` — pas de bundle Next.js embarqué. Mises à jour web sans republier l’app (sauf changements natifs).

## 1. Prérequis

- Node 20+
- **Android** : Android Studio + JDK 17
- **iOS** : Mac + Xcode 15+ (obligatoire pour App Store)
- Comptes : Google Play Console ✓, Apple Developer ✓

## 2. Setup local

```bash
cd mobile/ayeba-app
npm install
npx cap add android
npx cap add ios          # sur Mac uniquement
npx cap sync
```

Icônes store (à générer depuis `public/brand/ayeba-mark-192.png`) :
- Android : 512×512 PNG (Play Console)
- iOS : 1024×1024 PNG sans transparence

## 3. Android (Google Play)

```bash
npm run android
# Android Studio → Build → Generate Signed Bundle (AAB)
```

**Play Console — lancement RDC**
- Pays : **République démocratique du Congo** en premier (+ Belgique/France si besoin)
- Catégorie : **Outils** ou **Productivité**
- Cible : téléphones, min Android 7 (API 24)
- Taille APK/AAB annoncée : ~12 Mo
- Politique confidentialité : `https://ayeba.app/mentions-legales`
- Data safety : recherche web, compte optionnel (Google OAuth)

**Listing FR (RDC)**
- Titre : AYEBA — Recherche
- Courte : Moteur de recherche · Ayebi RDC · marchés
- Longue : AYEBA trouve le web et la RDC en une requête. Ayebi, cours, actualités. Léger, rapide.

## 4. iOS (App Store)

```bash
npm run ios
# Xcode → Signing (Apple Developer) → Archive → Distribute
```

- Bundle ID : `app.ayeba.mobile` (identique à capacitor.config.json)
- Catégorie : **Utilities** ou **Reference**
- Même URL distante : Apple accepte les apps WebView si l’expérience est complète
- Review : expliquer que c’est un moteur de recherche + encyclopédie RDC

## 5. Mode app léger (`?app=1`)

Côté web (déjà dans le repo) :
- UI mobile stabilisée (SERP, safe-area)
- Priorité locale RDC au premier lancement
- Pas de gros modules desktop (recherche profonde masquée en app)

## 6. Checklist avant soumission

- [ ] `https://ayeba.app/?app=1` OK sur 4G lent (Kinshasa)
- [ ] Icône 512 + captures 6,5" et tablette
- [ ] Connexion Google testée dans WebView
- [ ] Version `mobile/ayeba-app/package.json` = version store
- [ ] Notes de version FR

## 7. Coûts / délais

- Play : review ~1–3 jours (souvent plus rapide en RDC seul)
- Apple : 1–7 jours, parfois questions sur contenu web distant

## 8. Évolution

| Phase | Action |
|-------|--------|
| v1.0 | Shell remote (ce repo) |
| v1.1 | Cache offline accueil + Ayebi top articles |
| v2 | API Brave Search → meilleurs résultats mobile |
