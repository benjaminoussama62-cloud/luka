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
          <a href="#discovery">Découverte OpenID</a>
          <a href="#flow">Flux authorization code</a>
          <a href="#scopes">Scopes</a>
          <a href="#pkce">Clients publics (PKCE)</a>
          <a href="#claims">Profil utilisateur</a>
          <a href="#security">Bonnes pratiques</a>
          <Link href="/developers/console">→ Console OAuth</Link>
          <Link href="/developers/policy">→ Politique</Link>
        </nav>

        <article className="dev-docs-content">
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
