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
6. **Règles de confidentialité** (le champ de ta capture) :
   **`https://ayeba.app/privacy`** ← copie EXACTEMENT cette URL.
   La page couvre explicitement l'app Android (section 5) — exigé en review.

---

## Formulaire « Sécurité des données » (Data safety) — réponses exactes

L'app = coque WebView, permission **INTERNET uniquement**, aucun SDK pub.
Réponds comme ça — sous-déclarer = rejet, sur-déclarer = badge moche :

| Question | Réponse |
|---|---|
| L'app collecte-t-elle des données utilisateur ? | **Oui** (recherches + compte éventuel) |
| **Identité** — adresse e-mail, nom | Collecté, **facultatif**, finalité *fonctionnalité de l'app*, partagé : **non** |
| **Activité dans l'app** — requêtes de recherche | Collecté, **facultatif**, finalité *fonctionnalité*, partagé : **non** |
| **Performances** — journaux de plantage (Sentry) | Collecté, finalité *analyse*, partagé : **non** |
| Localisation / contacts / photos / fichiers / santé / finances | **Non collectées** |
| Données chiffrées en transit ? | **Oui** (HTTPS partout) |
| L'utilisateur peut demander la suppression ? | **Oui** — `https://ayeba.app/compte` ou contact@ayeba.app |
| Suivi publicitaire / profilage | **Non** |
| Annonces dans l'app ? | **Non** |

Écran « Publicité » → « Mon appli ne contient pas de publicité » : **OUI**
Écran « Public cible » → **Tout le monde** (pas d'app enfants)

---

## Écran « Informations de connexion » (App access)

Réponds **« Oui »** — l'app a un espace compte (login Google/mail) et des
sections limitées (Compte, Ayeba Mail). « Non » + un reviewer qui tombe
sur un écran de connexion = rejet.

- Crée un **compte de test dédié** (jamais le tien, jamais un admin) :
  `playreview@ayeba.app` / mot de passe simple, **sans 2FA**.
- Instructions à coller (FR + EN) :

```
Pour utiliser AYEBA, aucun compte n'est requis : la recherche fonctionne
librement. Seules les pages « Compte » et « Ayeba Mail » demandent une
connexion. Identifiants de test ci-dessous.

Account is NOT required: search works fully without login. Only the
"Compte" / "Ayeba Mail" sections ask for sign-in. Demo credentials below.
```

---

## Écran « Classification du contenu » (IARC)

- E-mail : `contact@ayeba.app` (ou ton adresse Play Console)
- Catégorie : **« Tous les autres types d'applications »** — pas « Social
  ou Communication » (même avec l'onglet communauté : l'affichage de
  contenu externe n'est pas la fonction principale)
- Cocher les conditions IARC, puis questionnaire :

| Question | Réponse |
|---|---|
| Violence / sexe / langage / substances / jeux d'argent | Non |
| Interaction entre utilisateurs / partage de contenu | Non — affichage seul |
| **Accès web non restreint** | **Oui** — navigateur intégré (liens arbitraires) → classification ~Teen/12+, normal pour un moteur |
| Localisation / achats / pubs | Non |

Sous-section UGC (si « Oui » à l'échange de contenu — Ayeba Mail est
accessible dans la coque) :

| Question | Réponse |
|---|---|
| Échange de contenu entre utilisateurs | **Oui** — Ayeba Mail accessible dans l'app |
| UGC = source principale du contenu | Non — les résultats de recherche dominent |
| Partage public de nudité | Non |
| Bloquer / signaler des utilisateurs ou du contenu | Non — aucune fonction de ce type dans le code |
| Modération des conversations | Non — messagerie privée entre comptes identifiés |
| Interactions limitées aux amis invités | Non — Mail envoie à toute adresse |
| Contenu en ligne | Oui — recherche web + navigateur intégré |

---

## Mot de passe keystore (garde-le)

- Mot de passe : `ayeba2026`
- Alias : `ayeba`
- (Google Play App Signing peut prendre en charge la clé de prod)
