import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité — AYEBA",
  description:
    "Comment Ayeba collecte, utilise et protège les données personnelles des utilisateurs du moteur de recherche et du compte Ayeba.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentShell
      title="Politique de confidentialité"
      subtitle="Cette politique décrit les pratiques d’Ayeba concernant les données personnelles liées à la recherche, au compte utilisateur et aux services associés (Ayebi, Studio, identité OAuth)."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles est l’éditeur du service Ayeba,
          joignable à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>{" "}
          et{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          . Le site principal du service est{" "}
          <a href="https://ayeba.app" className="text-[var(--ink)] underline">
            https://ayeba.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Principes">
        <p>
          Ayeba est conçu pour limiter la collecte au strict nécessaire au fonctionnement du
          moteur de recherche, de la sécurité des comptes et des services demandés par
          l’utilisateur. Nous ne vendons pas les requêtes de recherche à des annonceurs et nous
          n’exploitons pas de publicité comportementale ciblée sur le service de recherche.
        </p>
        <p>
          Les traitements sont effectués sur la base de l’exécution du service, de l’intérêt
          légitime (sécurité, amélioration de la pertinence sous forme agrégée) et, le cas
          échéant, du consentement (connexion sociale, préférences non essentielles).
        </p>
      </LegalSection>

      <LegalSection title="3. Données liées à la recherche">
        <p>Lors d’une recherche, Ayeba peut traiter :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>les termes saisis et le contexte technique de la requête ;</li>
          <li>des métadonnées techniques usuelles (adresse IP, agent utilisateur, horodatage) pour
            la sécurité et la stabilité du service ;</li>
          <li>des signaux d’usage agrégés ou anonymisés destinés à améliorer la pertinence des
            résultats.</li>
        </ul>
        <p>
          Ces données ne sont pas destinées à constituer un profil publicitaire nominatif. Les
          durées de conservation sont limitées à ce qui est nécessaire à la sécurité, au
          diagnostic et à l’amélioration du service.
        </p>
      </LegalSection>

      <LegalSection title="4. Compte Ayeba et authentification">
        <p>
          Si vous créez un compte ou vous connectez via un fournisseur d’identité (par exemple
          Google, GitHub ou Microsoft), Ayeba conserve les informations nécessaires à
          l’authentification et à la gestion de session : nom affiché, adresse e-mail,
          identifiant fourni par le prestataire, et préférences de compte.
        </p>
        <p>
          Les mots de passe locaux, lorsqu’ils existent, sont stockés sous forme hachée. Ayeba ne
          conserve pas de mot de passe en clair. Vous pouvez activer une authentification à deux
          facteurs depuis votre espace compte afin de renforcer la protection de votre identité.
        </p>
      </LegalSection>

      <LegalSection title="5. « Se connecter avec Ayeba » (OAuth / OpenID)">
        <p>
          Lorsque vous autorisez une application tierce ou une application sœur à utiliser votre
          compte Ayeba, celle-ci ne reçoit que les informations correspondant aux permissions
          (scopes) que vous avez acceptées, après affichage d’un écran de consentement. Vous
          pouvez retirer cet accès à tout moment depuis{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications connectées
          </Link>
          .
        </p>
        <p>
          Les développeurs d’applications sont tenus de respecter la politique développeurs et de
          n’utiliser les données que pour les finalités déclarées. Ayeba peut suspendre une
          application en cas d’abus ou de non-conformité.
        </p>
      </LegalSection>

      <LegalSection title="6. Indexation web et contenu">
        <p>
          Ayeba explore et indexe des contenus publics disponibles sur Internet, dans le respect
          des directives robots et des bonnes pratiques d’indexation. Les extraits affichés dans
          les résultats proviennent de sources tierces. Les éditeurs de sites peuvent demander la
          mise à jour, la non-indexation ou le retrait d’une URL via{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies et stockage local">
        <p>
          Un cookie de session sécurisé peut être déposé après connexion. Des préférences
          (langue, marché, interface) peuvent être conservées localement dans le navigateur.
          Aucun cookie publicitaire tiers n’est déposé par défaut sur le moteur de recherche.
        </p>
      </LegalSection>

      <LegalSection title="8. Destinataires et sous-traitants">
        <p>
          Les données peuvent être traitées par des prestataires techniques nécessaires à
          l’hébergement, à la base de données et à la sécurité du service. Ces prestataires
          agissent selon nos instructions et dans le cadre de mesures de protection adaptées.
          Aucune cession commerciale de fichiers d’utilisateurs n’est réalisée.
        </p>
      </LegalSection>

      <LegalSection title="9. Vos droits">
        <p>
          Conformément au RGPD et aux lois applicables, vous disposez notamment des droits
          d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité,
          dans les conditions prévues par la réglementation. Vous pouvez également introduire une
          réclamation auprès de l’autorité de protection des données compétente.
        </p>
        <p>
          Pour exercer vos droits relatifs à votre compte Ayeba, écrivez à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>{" "}
          en précisant l’objet de votre demande. Nous répondons dans les délais légaux. Une
          vérification d’identité peut être demandée afin d’éviter toute divulgation abusive.
        </p>
        <p>
          Pour une vue d’ensemble des droits et recours, consultez également la page{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Sécurité">
        <p>
          Ayeba met en œuvre des mesures techniques et organisationnelles destinées à protéger
          les comptes et les données contre l’accès non autorisé, la perte ou l’altération. Aucun
          système n’étant infaillible, nous vous encourageons à utiliser un mot de passe unique et
          à activer la double authentification lorsque disponible.
        </p>
      </LegalSection>

      <LegalSection title="11. Modifications">
        <p>
          Cette politique peut être mise à jour pour refléter l’évolution du service ou des
          obligations légales. La date de mise à jour figure en tête de page. En cas de
          modification substantielle, nous pourrons en informer les utilisateurs connectés par un
          moyen approprié.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
