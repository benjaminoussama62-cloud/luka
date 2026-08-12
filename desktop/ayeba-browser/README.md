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

Sortie : `dist/AYEBA-Portable-1.0.0.zip`

### Publier une release GitHub (obligatoire pour le bouton public)

1. Ouvre https://github.com/benjaminoussama62-cloud/luka/releases/new  
2. Tag : `browser-v1.0.0` (ou version suivante)  
3. Titre : `AYEBA Browser 1.0.0`  
4. Joins le fichier `desktop/ayeba-browser/dist/AYEBA-Portable-1.0.0.zip`  
5. Publie la release  

Le bouton sur ayeba.app pointe vers :
`https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-1.0.0.zip`
