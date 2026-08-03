# Ayeba — Moteur de recherche

Moteur **mondial** (style Google / Yandex), recherche **web live**, priorité RDC, profil utilisateur.

## Démarrer

```bash
npm install
npm run dev
```

→ http://localhost:3000

## Ce qui est réel

- Recherche live via Wikipédia, DuckDuckGo, Google News RSS
- Connexion profil (email ou Continuer avec Google)
- UI sombre type Google/Yandex + dégradé rouge/gris
- 12 modes avancés (Recherche Profonde, canevas, Zéro IA, curseurs…)

## API

`POST /api/search` `{ "query": "Kinshasa", "sliders": {...} }`
