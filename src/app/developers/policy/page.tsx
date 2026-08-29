import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";

export const metadata: Metadata = {
  title: "Politique développeurs — Ayeba",
  description:
    "Règles d’accès, responsabilités et exigences pour les applications utilisant Se connecter avec Ayeba.",
};

export default function DevelopersPolicyPage() {
  return (
    <DevelopersShell
      activePath="/developers/policy"
      kicker="Politique"
      title="Politique d’accès pour les développeurs"
    >
      <article className="space-y-6">
        <section className="dev-docs-section ayeba-panel">
          <h2>1. Objet</h2>
          <p>
            La présente politique définit les conditions dans lesquelles un éditeur d’application
            peut demander l’accès à des comptes Ayeba via le protocole OAuth 2.0 / OpenID Connect
            (« Se connecter avec Ayeba »). Elle complète les{" "}
            <Link href="/terms">conditions générales</Link> et la{" "}
            <Link href="/privacy">politique de confidentialité</Link> applicables aux utilisateurs.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>2. Qui peut intégrer</h2>
          <p>
            Peuvent demander un accès : les applications de l’écosystème Ayeba, ainsi que les
            éditeurs tiers qui proposent un service légitime et identifiable (site web, politique
            de confidentialité, finalité claire). Ayeba se réserve le droit de refuser, suspendre
            ou retirer un accès en cas de risque pour les utilisateurs, de tromperie, d’abus
            technique ou de non-respect de la présente politique.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>3. Consentement et minimisation</h2>
          <p>
            Toute demande d’accès aux données d’un utilisateur doit passer par l’écran de
            consentement Ayeba. Vous ne devez demander que les scopes strictement nécessaires à
            votre service. Les scopes disponibles portent sur l’identité de base (identifiant
            stable, e-mail, profil affiché) ; toute extension éventuelle fera l’objet d’une
            documentation et d’une revue dédiées.
          </p>
          <p>
            Les utilisateurs peuvent révoquer l’accès depuis leur compte. Vous devez honorer cette
            révocation pour les accès futurs et cesser d’utiliser les jetons associés.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>4. Protection des secrets et des jetons</h2>
          <p>
            Les secrets client et les jetons d’accès sont confidentiels. Ils doivent être stockés
            et échangés uniquement côté serveur, jamais exposés dans une application mobile non
            sécurisée, une page web publique, un dépôt de code ouvert ou un message non protégé.
            En cas de compromission suspectée, régénérez immédiatement le secret depuis la console
            et contactez{" "}
            <a href="mailto:security@ayeba.app">security@ayeba.app</a>.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>5. Redirect URIs et environnements</h2>
          <p>
            Seules les URI de redirection préalablement enregistrées et validées sont acceptées.
            Les URI de production doivent utiliser HTTPS. Les environnements de développement
            locaux sont tolérés sous conditions strictes (hôtes locaux uniquement). Toute
            modification sensible peut entraîner une nouvelle vérification.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>6. Vérification des applications</h2>
          <p>
            Avant une utilisation large en production, les applications publiques font l’objet
            d’une vérification par Ayeba : identité de l’éditeur, cohérence du site, finalité,
            URI de redirection, et usage déclaré des données. Les délais de revue dépendent de
            la qualité du dossier transmis. Contact :{" "}
            <a href="mailto:developers@ayeba.app">developers@ayeba.app</a>.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>7. Interdictions</h2>
          <ul className="dev-docs-list">
            <li>Usurper l’identité d’Ayeba ou tromper l’utilisateur sur la nature du service.</li>
            <li>Revendre ou céder des données d’identité obtenues via Ayeba sans base légale et sans information claire.</li>
            <li>Contourner le consentement, les contrôles d’accès ou les mécanismes de révocation.</li>
            <li>Utiliser le service pour du spam, de la fraude, du harcèlement ou toute activité illicite.</li>
          </ul>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>8. Responsabilité de l’éditeur</h2>
          <p>
            L’éditeur de l’application demeure responsable du traitement qu’il effectue une fois
            les données reçues, y compris envers les utilisateurs et les autorités compétentes. Il
            doit disposer d’une politique de confidentialité accessible et à jour.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>9. Modifications</h2>
          <p>
            Ayeba peut mettre à jour la présente politique pour renforcer la protection des
            utilisateurs ou refléter l’évolution du service. Les éditeurs sont invités à consulter
            régulièrement cette page. Un manquement grave peut entraîner la suspension immédiate
            de l’accès OAuth.
          </p>
        </section>

        <section className="dev-docs-section ayeba-panel">
          <h2>10. Contact</h2>
          <p>
            Intégration et vérification :{" "}
            <a href="mailto:developers@ayeba.app">developers@ayeba.app</a>
            <br />
            Sécurité :{" "}
            <a href="mailto:security@ayeba.app">security@ayeba.app</a>
            <br />
            Support général :{" "}
            <Link href="/support">ayeba.app/support</Link>
          </p>
        </section>
      </article>
    </DevelopersShell>
  );
}
