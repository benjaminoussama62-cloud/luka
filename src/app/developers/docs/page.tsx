import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { oauthEndpoint } from "@/lib/oauth-provider/endpoints";

export const metadata: Metadata = {
  title: "Documentation OAuth — Ayeba Developers",
  description:
    "Intégration Se connecter avec Ayeba : flux authorization code, OpenID Connect, scopes et bonnes pratiques.",
};

export default function DevelopersDocsPage() {
  return (
    <DevelopersShell
      activePath="/developers/docs"
      kicker="Documentation"
      title="Intégrer Se connecter avec Ayeba"
    >
      <div className="dev-docs-layout">
        <nav className="dev-docs-toc ayeba-panel" aria-label="Sommaire">
          <a href="#overview">Vue d’ensemble</a>
          <a href="#api-auth">Clés API</a>
          <a href="#api-search">Search API</a>
          <a href="#api-suggest">Suggest API</a>
          <a href="#api-errors">Erreurs & quotas</a>
          <a href="#discovery">Découverte OpenID</a>
          <a href="#flow">Flux authorization code</a>
          <a href="#scopes">Scopes</a>
          <a href="#pkce">Clients publics (PKCE)</a>
          <a href="#claims">Profil utilisateur</a>
          <a href="#security">Bonnes pratiques</a>
          <Link href="/developers/console">→ Console</Link>
          <Link href="/developers/policy">→ Politique</Link>
        </nav>

        <article className="dev-docs-content">
          <section id="api-auth" className="dev-docs-section ayeba-panel">
            <h2>Clés API — authentification</h2>
            <p>
              Les APIs REST <code>/api/v1/*</code> s’authentifient par clé, créée dans la{" "}
              <Link href="/developers/console/cles">console</Link> et rattachée à un projet.
              Le secret complet n’est affiché qu’une fois — seul son hash est conservé côté serveur.
            </p>
            <pre className="dcw-pre">{`curl "https://ayeba.app/api/v1/search?q=kinshasa" \\
  -H "Authorization: Bearer ayb_live_…"`}</pre>
            <p className="mt-3">
              Chaque clé peut être limitée par <strong>portées</strong> (search, suggest),{" "}
              <strong>quota quotidien</strong>, <strong>référents</strong> et{" "}
              <strong>adresses IP</strong> autorisés. Les appels sont journalisés et visibles dans
              l’onglet Journaux de la console.
            </p>
          </section>

          <section id="api-search" className="dev-docs-section ayeba-panel">
            <h2>Ayeba Search API</h2>
            <p>
              <code className="dev-console-code">GET /api/v1/search?q=…&limit=10</code> —
              recherche web sur l’index Ayeba. Réponse JSON :
            </p>
            <pre className="dcw-pre">{`{
  "query": "kinshasa",
  "total": 27,
  "results": [
    { "title": "…", "url": "https://…", "domain": "…", "description": "…" }
  ],
  "knowledge": null | { … }
}`}</pre>
            <p className="mt-3">
              <code>limit</code> : 1–50 (défaut 10). Portée requise : <code>search</code>.
            </p>
          </section>

          <section id="api-suggest" className="dev-docs-section ayeba-panel">
            <h2>Ayeba Suggest API <span className="dcw-chip dcw-chip-blue">Bêta</span></h2>
            <p>
              <code className="dev-console-code">GET /api/v1/suggest?q=…&limit=8</code> —
              suggestions de recherche en temps réel (autocomplete). Réponse :
            </p>
            <pre className="dcw-pre">{`{ "query": "kin", "suggestions": ["kinshasa", "…"] }`}</pre>
            <p className="mt-3">
              <code>limit</code> : 1–10 (défaut 8). Portée requise : <code>suggest</code>.
            </p>
          </section>

          <section id="api-errors" className="dev-docs-section ayeba-panel">
            <h2>Erreurs & quotas</h2>
            <ul className="dev-docs-list">
              <li><strong>401</strong> — clé absente ou invalide.</li>
              <li>
                <strong>403</strong> — clé désactivée/révoquée, portée manquante, ou restriction
                référent/IP non satisfaite.
              </li>
              <li><strong>429</strong> — quota quotidien de la clé dépassé.</li>
              <li><strong>400</strong> — paramètre <code>q</code> manquant ou invalide.</li>
            </ul>
            <p className="mt-3">
              Les quotas sont par clé et par jour (minuit UTC). Augmentez-les dans la console ou
              créez plusieurs clés par environnement (dev/prod).
            </p>
          </section>

          <section id="overview" className="dev-docs-section ayeba-panel">
            <h2>Vue d’ensemble</h2>
            <p>
              Ayeba agit comme fournisseur d’identité. Après autorisation par l’utilisateur, votre
              application reçoit des jetons lui permettant de reconnaître de façon stable la même
              personne à travers vos services, sans gérer elle-même le mot de passe Ayeba.
            </p>
            <p>
              Les identifiants de votre application (client_id, client_secret, redirect URIs) sont
              délivrés exclusivement dans la{" "}
              <Link href="/developers/console">console OAuth</Link> après authentification. Ils ne
              sont pas publiés sur les pages marketing du site.
            </p>
          </section>

          <section id="discovery" className="dev-docs-section ayeba-panel">
            <h2>Découverte OpenID</h2>
            <p>
              Comme pour tout fournisseur OpenID Connect conforme, les endpoints publics sont
              décrits dans le document de découverte. Votre serveur doit lire ce document plutôt
              que de coder en dur des chemins susceptibles d’évoluer :
            </p>
            <p className="mt-3">
              <code className="dev-console-code">{oauthEndpoint("discovery")}</code>
            </p>
            <p className="mt-3">
              Ce document expose notamment les adresses d’autorisation, d’échange de jetons et
              d’informations utilisateur, ainsi que les algorithmes de signature des id_token.
            </p>
          </section>

          <section id="flow" className="dev-docs-section ayeba-panel">
            <h2>Flux authorization code</h2>
            <p>
              Le flux recommandé pour les applications serveur est le code d’autorisation
              (<code> response_type=code</code>. L’utilisateur est redirigé vers Ayeba, s’authentifie
              et consent, puis revient sur votre redirect_uri avec un code à courte durée de vie.
            </p>
            <p>
              L’échange du code contre des jetons s’effectue uniquement côté serveur, avec votre
              client_secret (ou PKCE pour les clients publics). Ne placez jamais le secret dans une
              application frontale, un dépôt public ou une URL.
            </p>
            <p>
              Paramètres usuels de la requête d’autorisation : <code>client_id</code>,{" "}
              <code>redirect_uri</code> (exactement enregistrée), <code>scope</code>,{" "}
              <code>state</code> (anti-CSRF), et le cas échéant <code>code_challenge</code>.
            </p>
          </section>

          <section id="scopes" className="dev-docs-section ayeba-panel">
            <h2>Scopes</h2>
            <ul className="dev-docs-list">
              <li>
                <strong>openid</strong> — identité OpenID ; nécessaire pour recevoir un id_token.
              </li>
              <li>
                <strong>email</strong> — adresse e-mail associée au compte Ayeba.
              </li>
              <li>
                <strong>profile</strong> — nom affiché et éléments de profil.
              </li>
            </ul>
            <p className="mt-3">
              Demandez uniquement ce dont votre produit a réellement besoin. Un usage excessif des
              scopes peut retarder ou empêcher la vérification de l’application.
            </p>
          </section>

          <section id="pkce" className="dev-docs-section ayeba-panel">
            <h2>Clients publics (PKCE)</h2>
            <p>
              Pour les applications qui ne peuvent pas conserver un secret (certaines SPA, clients
              natifs), utilisez PKCE avec la méthode S256 : un code_challenge à l’étape
              d’autorisation, puis le code_verifier lors de l’échange de jetons. Même dans ce cas,
              validez toujours le paramètre <code>state</code> et restreignez les redirect URIs.
            </p>
          </section>

          <section id="claims" className="dev-docs-section ayeba-panel">
            <h2>Profil utilisateur</h2>
            <p>
              Après obtention d’un access_token, votre serveur peut consulter l’endpoint userinfo
              (découvert via OpenID Configuration) pour lire l’identifiant stable{" "}
              <code>sub</code> et, selon les scopes accordés, l’e-mail et le profil. Traitez{" "}
              <code>sub</code> comme clé primaire d’identité côté votre application — pas l’e-mail
              seul, qui peut évoluer.
            </p>
          </section>

          <section id="security" className="dev-docs-section ayeba-panel">
            <h2>Bonnes pratiques</h2>
            <ul className="dev-docs-list">
              <li>Échangez les codes et stockez les secrets uniquement côté serveur.</li>
              <li>Utilisez HTTPS en production pour toutes les redirect URIs.</li>
              <li>Vérifiez le paramètre state à chaque retour d’autorisation.</li>
              <li>Révoquez et régénérez un secret dès qu’il a pu être exposé.</li>
              <li>Informez clairement vos utilisateurs de l’usage que vous faites de leurs données.</li>
              <li>
                Respectez la{" "}
                <Link href="/developers/policy">politique développeurs</Link> et les droits des
                personnes décrits sur{" "}
                <Link href="/droits">ayeba.app/droits</Link>.
              </li>
            </ul>
          </section>
        </article>
      </div>
    </DevelopersShell>
  );
}
