# AYEBA Browser (Windows)

Navigateur desktop **Edge-like** pour Ayeba : vrais onglets Chromium, barre d’adresse, menu fonctionnel.

## Pour les utilisateurs

Téléchargement public : **https://ayeba.app/telecharger**

1. Télécharger le ZIP  
2. Extraire  
3. Lancer `AYEBA.exe`

## Dev local

```bash
cd desktop/ayeba-browser
npm install
npm start
```

### GPU / mode sans échec

L'accélération matérielle est **activée par défaut** (vidéo, WebGL fluides).
Si le processus GPU crash (vieux pilote, antivirus 360…), AYEBA écrit
`%APPDATA%\AyebaBrowser\gpu-safe-mode` et redémarre en rendu logiciel.

Variables d'environnement :

| Variable | Effet |
| --- | --- |
| `AYEBA_GPU=0` | Force le rendu logiciel |
| `AYEBA_GPU=1` | Force le matériel (supprime le drapeau safe-mode) |
| `AYEBA_DEBUG=1` | Journalise aussi sur stderr |

### Raccourcis (actifs même quand la page a le focus)

Ctrl+T/W/N · Ctrl+Shift+N (InPrivate) · Ctrl+L (omnibox) · Ctrl+R (+Shift = forcé) ·
Ctrl+F · Ctrl+H · Ctrl+J · Ctrl+P · Ctrl+D · Ctrl+Shift+O (favoris) ·
Ctrl+Tab / Ctrl+Shift+Tab · Alt+←/→ · F12 ou Ctrl+Shift+I (DevTools)

## Build distribution

```bash
npm run dist
```

Sortie installateur : `dist/AYEBA-Setup-1.0.7.exe` (téléchargement direct sur ayeba.app/telecharger)

Sortie portable (option avancée) : `dist/AYEBA-Portable-1.0.7.zip`

```bash
npm run dist          # installateur .exe (recommandé)
npm run dist:portable # ZIP portable
npm run dist:all      # les deux
```

### Publier une release GitHub (obligatoire pour le bouton public)

1. Ouvre https://github.com/benjaminoussama62-cloud/luka/releases/new
2. Tag : `browser-v1.0.7` (ou version suivante)
3. Titre : `AYEBA Browser 1.0.7`
4. Joins **`desktop/ayeba-browser/dist/AYEBA-Setup-1.0.7.exe`** (installateur — priorité)
5. Joins optionnellement `AYEBA-Portable-1.0.7.zip`
6. Publie la release  

Le bouton sur ayeba.app télécharge directement :
`https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Setup-1.0.7.exe`
