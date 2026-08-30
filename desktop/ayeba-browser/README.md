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

## Build distribution

```bash
npm run dist
```

Sortie installateur : `dist/AYEBA-Setup-1.0.4.exe` (téléchargement direct sur ayeba.app/telecharger)

Sortie portable (option avancée) : `dist/AYEBA-Portable-1.0.4.zip`

```bash
npm run dist          # installateur .exe (recommandé)
npm run dist:portable # ZIP portable
npm run dist:all      # les deux
```

### Publier une release GitHub (obligatoire pour le bouton public)

1. Ouvre https://github.com/benjaminoussama62-cloud/luka/releases/new  
2. Tag : `browser-v1.0.4` (ou version suivante)  
3. Titre : `AYEBA Browser 1.0.4`  
4. Joins **`desktop/ayeba-browser/dist/AYEBA-Setup-1.0.4.exe`** (installateur — priorité)  
5. Joins optionnellement `AYEBA-Portable-1.0.4.zip`  
6. Publie la release  

Le bouton sur ayeba.app télécharge directement :
`https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Setup-1.0.4.exe`
