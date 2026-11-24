# AYEBA — Script Nano Banana : captures App Store

> Usage : coller le bloc « SPEC GLOBALE » + le prompt de la capture dans Nano Banana,
> avec la capture PNG en pièce jointe. Répéter pour chaque visuel.

## Rappel tailles Apple

- Cible finale par visuel : **1290 × 2796 px** (iPhone 6,7") — obligatoire.
- Les captures source font 1179×2556 : elles servent de contenu dans le cadre, pas de visuel final.
- Vérifier que chaque fichier généré fait exactement 1290×2796 avant upload dans App Store Connect.

## SPEC GLOBALE (à coller en tête de chaque prompt)

```
STYLE — série de 5 visuels App Store pour l'application "AYEBA" (moteur de recherche et navigateur).

RÈGLE ABSOLUE : la capture d'écran fournie en pièce jointe doit être réutilisée À L'IDENTIQUE,
pixel par pixel, à l'intérieur d'un cadre iPhone. Ne redessine, ne réécris, ne traduis et ne
modifie AUCUN élément de l'interface (textes, icônes, couleurs, boutons). Le contenu de
l'écran doit rester une photo fidèle de l'app.

COMPOSITION (format portrait strict, sortie 1290×2796 px, ratio ~9:19,5) :
- Fond : dégradé vertical très sombre, du noir profond #05090C vers un bleu-vert pétrole
  #0C2630, avec un léger halo lumineux derrière l'appareil (glow teal discret, pas de flare).
- Titre marketing en haut, centré, grande typographie blanche épaisse style SF Pro Display
  Bold / Inter ExtraBold, courte (2 à 6 mots), nette et parfaitement lisible.
- Sous-titre sous le titre, gris clair #9FB4C0, typographie fine (SF Pro / Inter Regular),
  une seule ligne.
- Cadre iPhone moderne (style iPhone 16 Pro, bord titane fin, encoche Dynamic Island)
  centré dans le tiers inférieur, occupant ~70 % de la hauteur totale, légèrement biseauté
  avec reflet subtil sur la tranche. Le bas de l'écran peut dépasser légèrement du cadre
  (crop naturel bas de page).
- Accent de marque : un trait fin ou un détail orange #E8721A (souligné du titre ou liseré),
  utilisé avec parcimonie — pas d'orange dominant.
- Pas de filigrane, pas de texte supplémentaire, pas de main humaine, pas de décor
  (pas de plantes/bureau), pas d'autres appareils. Résultat propre, premium, style
  captures App Store de Chrome / Bing / Edge.
```

---

## CAPTURE 1 — Accueil (ayeba.app_(iPhone 16) (2).png)

Titre : **Le monde entier, une requête.**
Sous-titre : **Moteur de recherche indépendant & navigateur intégré**

```
[SPEC GLOBALE ci-dessus]

Visuel 1/5 — page d'accueil AYEBA.
Titre en haut : « Le monde entier, une requête. »
Sous-titre : « Moteur de recherche indépendant & navigateur intégré »
Insère la capture jointe dans le cadre iPhone, à l'identique. C'est le visuel phare de la
série : halo légèrement plus marqué derrière l'appareil, composition la plus aérée.
```

## CAPTURE 2 — Réponses directes (ayeba.app_(iPhone 16) (3).png)

Titre : **La réponse avant le lien.**
Sous-titre : **Définitions, calculs et fiches affichés instantanément**

```
[SPEC GLOBALE ci-dessus]

Visuel 2/5 — résultats de recherche avec encart « RÉPONSE COURTE ».
Titre en haut : « La réponse avant le lien. »
Sous-titre : « Définitions, calculs et fiches affichés instantanément »
Insère la capture jointe à l'identique. L'encart orange « RÉPONSE COURTE » doit rester
parfaitement lisible — c'est la preuve produit de ce visuel.
```

## CAPTURE 3 — Marchés en direct (ayeba.app_marches(iPhone 16).png)

Titre : **Les marchés en direct.**
Sous-titre : **Change, carburants et crypto en temps réel**

```
[SPEC GLOBALE ci-dessus]

Visuel 3/5 — page Marchés AYEBA (taux USD→CDF, devises, carburants).
Titre en haut : « Les marchés en direct. »
Sous-titre : « Change, carburants et crypto en temps réel »
Insère la capture jointe à l'identique. Le grand taux « 2 318,00 » et les cartes devises
doivent rester nets et lisibles dans le cadre.
```

## CAPTURE 4 — Ayebi (ayeba.app_ayebi(iPhone 16).png)

Titre : **Une encyclopédie 100 % RDC.**
Sous-titre : **Ayebi : des fiches libres et collaboratives**

```
[SPEC GLOBALE ci-dessus]

Visuel 4/5 — Ayebi, encyclopédie collaborative intégrée à l'écosystème AYEBA.
Titre en haut : « Une encyclopédie 100 % RDC. »
Sous-titre : « Ayebi : des fiches libres et collaboratives »
Insère la capture jointe à l'identique. Les catégories (Institutions, Culture & Arts,
Économie & Mines…) doivent rester lisibles.
```

## CAPTURE 5 — Compte Ayeba (ayeba.app_(iPhone 16) (4).png)

Titre : **Un compte, tout Ayeba.**
Sous-titre : **Favoris, préférences et services synchronisés**

```
[SPEC GLOBALE ci-dessus]

Visuel 5/5 — écran de connexion AYEBA (carte « SESSION »).
Titre en haut : « Un compte, tout Ayeba. »
Sous-titre : « Favoris, préférences et services synchronisés »
Insère la capture jointe à l'identique — y compris le fond flouté derrière la carte de
connexion, qui donne la profondeur. Composition sobre, ambiance « sécurité ».
```

---

## Ordre recommandé dans App Store Connect

1. Accueil — promesse globale
2. Réponses directes — la différenciation
3. Marchés — données temps réel
4. Ayebi — écosystème de contenu
5. Compte — synchronisation (bonus, facultatif)

## ⚠️ iPad

Le build est universel (iPhone + iPad) : App Store Connect exigera aussi des captures
**iPad 13" (2048×2732 px)**. Deux options : faire des captures iPad du site/app et
réutiliser exactement les mêmes prompts (adapter la taille et le cadre « iPad Pro »),
ou limiter le build à iPhone (TARGETED_DEVICE_FAMILY=1) — nécessite un rebuild.
