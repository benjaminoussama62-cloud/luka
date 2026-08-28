# Play Console — remplir EXACTEMENT comme ça

## Écran « Créer une application »

| Champ | Valeur |
|-------|--------|
| **Nom de l'application** | `AYEBA` |
| **Nom du package** | `app.ayeba.mobile` |
| **Appli ou jeu** | **Appli** |
| **Gratuite ou payante** | **Sans frais** |
| **Déclarations** | cocher les 2 cases |

Clique **Créer une application**.

---

## Où prendre le fichier (.aab)

Ton PC n'a pas Java — le fichier est construit sur **GitHub** :

1. Va sur : https://github.com/benjaminoussama62-cloud/luka/actions
2. Ouvre le workflow **« Build AYEBA Android AAB »**
3. Clique **Run workflow** → Run (si pas encore lancé)
4. Quand c'est vert ✓ → en bas **Artifacts**
5. Télécharge **AYEBA-PlayStore-aab**
6. Dedans : **`app-release.aab`** ← c'est CE fichier pour Play Console

Chemin local (si tu installes Android Studio plus tard) :
```
C:\Users\ADMIN\DevAlpha org\luka\mobile\ayeba-app\AYEBA-1.0.0.aab
```
(généré par `powershell mobile/ayeba-app/scripts/build-aab.ps1`)

---

## Uploader sur Play Console

1. Menu gauche → **Tester et publier** → **Tests internes** (ou Production)
2. **Créer une version**
3. **Importer** → choisis `app-release.aab`
4. Pays : **République démocratique du Congo** en premier
5. Remplis fiche store (icône 512×512, 2 captures minimum)
6. Politique : https://ayeba.app/mentions-legales

---

## Mot de passe keystore (garde-le)

- Mot de passe : `ayeba2026`
- Alias : `ayeba`
- (Google Play App Signing peut prendre en charge la clé de prod)
