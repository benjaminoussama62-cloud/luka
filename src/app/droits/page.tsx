import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Vos droits — AYEBA",
  description:
    "Droits des personnes sur le compte Ayeba : accès, rectification, effacement, opposition, portabilité, applications connectées et réclamations.",
};

export default function DroitsPage() {
  return (
    <LegalDocumentShell
      title="Vos droits"
      subtitle="Cette page détaille les droits dont vous disposez concernant vos données personnelles et votre compte Ayeba, ainsi que la manière concrète de les exercer. Elle complète la politique de confidentialité sans la remplacer."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Droit d’accès">
        <p>
          Vous avez le droit d’obtenir la confirmation que des données vous concernant sont
          traitées par Ayeba, et d’accéder aux informations principales liées à votre compte :
          identité déclarée, adresse e-mail, préférences enregistrées, et historique des
          autorisations d’applications lorsque disponible dans votre espace compte.
        </p>
        <p>
          Pour une demande formelle d’accès au-delà de ce que l’interface affiche déjà, écrivez à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>{" "}
          depuis l’adresse associée au compte, ou joignez tout élément permettant de vérifier votre
          identité. Nous pouvons refuser une demande si elle met en péril les droits d’autrui, la
          sécurité du service, ou si elle est manifestement abusive.
        </p>
        <p>
          La réponse peut être fournie sous forme électronique. Certains journaux techniques
          purement opérationnels peuvent ne pas être communiqués lorsqu’ils ne constituent pas des
          données personnelles identifiables ou lorsqu’une exception légale s’applique.
        </p>
      </LegalSection>

      <LegalSection title="2. Droit de rectification">
        <p>
          Vous pouvez faire corriger des données inexactes ou incomplètes : nom affiché, adresse
          e-mail de contact (sous réserve de vérification), préférences de langue ou de marché, et
          autres champs modifiables dans le compte.
        </p>
        <p>
          Lorsque la correction est possible directement depuis{" "}
          <Link href="/compte" className="text-[var(--ink)] underline">
            votre compte
          </Link>
          , privilégiez cette voie : elle est plus rapide et laisse une trace claire de la
          modification. Sinon, adressez votre demande à privacy@ayeba.app en précisant la valeur
          erronée et la valeur souhaitée.
        </p>
        <p>
          Si vous vous êtes inscrit via un fournisseur social (Google, GitHub, Microsoft), certaines
          informations d’identité peuvent devoir être mises à jour chez ce fournisseur avant d’être
          reflétées côté Ayeba.
        </p>
      </LegalSection>

      <LegalSection title="3. Effacement et clôture du compte">
        <p>
          Vous pouvez demander la suppression de votre compte Ayeba et des données personnelles
          associées. La demande doit être claire et émaner de la personne concernée ou d’un
          mandataire dûment justifié. Après validation, nous procédons à la clôture dans un délai
          raisonnable compatible avec les opérations techniques nécessaires.
        </p>
        <p>
          Certaines données peuvent être conservées temporairement lorsque la loi l’exige ou le
          permet : gestion d’un litige, prévention de la fraude, obligations comptables ou
          réponses aux autorités compétentes. Les traces purement techniques anonymisées ou
          agrégées, qui ne permettent plus de vous identifier, peuvent être conservées pour la
          sécurité et l’amélioration du service.
        </p>
        <p>
          La suppression du compte Ayeba n’efface pas automatiquement les copies éventuelles déjà
          détenues par une application tierce que vous avez autorisée. Pour ces copies, vous devez
          exercer vos droits auprès de l’éditeur concerné, selon sa propre politique.
        </p>
        <p>
          Après clôture, la reconnexion avec les mêmes identifiants peut ne plus être possible. Si
          vous créez un nouveau compte plus tard, il s’agira d’une nouvelle relation, sauf
          contrainte technique de prévention d’abus.
        </p>
      </LegalSection>

      <LegalSection title="4. Opposition et limitation">
        <p>
          Lorsque le traitement repose sur l’intérêt légitime, vous pouvez vous y opposer pour des
          raisons tenant à votre situation particulière. Vous pouvez aussi demander une limitation
          temporaire du traitement dans les cas prévus par la réglementation (contestation de
          l’exactitude des données, opposition en cours d’examen, etc.).
        </p>
        <p>
          L’opposition n’est pas absolue : les traitements nécessaires à l’exécution du service que
          vous demandez, au respect d’une obligation légale, ou à la sécurité du service et des
          autres utilisateurs, peuvent être maintenus. Nous vous indiquerons les suites données à
          votre demande.
        </p>
        <p>
          Pour les cookies ou préférences non essentielles stockées localement, vous pouvez aussi
          agir depuis les réglages de votre navigateur. Cela n’équivaut pas toujours à une
          opposition au traitement serveur, mais peut limiter certaines personnalisations.
        </p>
      </LegalSection>

      <LegalSection title="5. Applications connectées et consentement">
        <p>
          Lorsque vous utilisez « Se connecter avec Ayeba », vous choisissez d’autoriser une
          application à recevoir certaines informations, selon les permissions affichées sur
          l’écran de consentement. Ce consentement est révocable.
        </p>
        <p>
          Depuis{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications connectées
          </Link>
          , vous pouvez retirer l’accès d’une application. Le retrait empêche de nouveaux accès via
          les autorisations Ayeba. Il ne constitue pas une suppression automatique des données déjà
          enregistrées chez l’éditeur tiers.
        </p>
        <p>
          Si une application vous paraît trompeuse, abusive ou non conforme à ce qui vous a été
          présenté, signalez-la à{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>{" "}
          et révoquez l’accès. Ayeba peut suspendre une application éditeur en cas de manquement
          grave à sa politique développeurs.
        </p>
      </LegalSection>

      <LegalSection title="6. Portabilité">
        <p>
          Lorsque la réglementation le prévoit et que les conditions techniques le permettent, vous
          pouvez demander à recevoir certaines données que vous avez fournies dans un format
          structuré couramment utilisé, ou demander leur transmission à un autre responsable lorsque
          cela est possible.
        </p>
        <p>
          La portabilité ne couvre pas nécessairement l’ensemble des données dérivées, des journaux
          de sécurité ou des contenus indexés provenant du web public. Précisez dans votre demande
          les catégories de données souhaitées afin d’éviter un périmètre excessif.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité de l’exercice des droits">
        <p>
          Pour protéger votre vie privée, Ayeba peut demander des informations supplémentaires avant
          de répondre à une demande sensible (effacement, export, changement d’e-mail). L’objectif
          est d’éviter qu’un tiers obtienne ou détruise vos données par usurpation.
        </p>
        <p>
          Renforcez votre compte via{" "}
          <Link href="/compte/securite" className="text-[var(--ink)] underline">
            Compte → Sécurité
          </Link>
          . Un mot de passe unique et, lorsque disponible, une double authentification réduisent le
          risque qu’un tiers exerce vos droits à votre place.
        </p>
      </LegalSection>

      <LegalSection title="8. Réclamations et recours">
        <p>
          Si vous estimez que vos droits n’ont pas été respectés, contactez d’abord{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Exposez les faits, la date de votre demande initiale et la réponse reçue. Nous
          examinerons le dossier de bonne foi.
        </p>
        <p>
          Vous conservez le droit d’introduire une réclamation auprès de l’autorité de protection
          des données compétente dans votre pays de résidence ou de séjour habituel. Ce recours
          s’exerce indépendamment des démarches amiables auprès d’Ayeba.
        </p>
      </LegalSection>

      <LegalSection title="9. Documents et contacts associés">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Link href="/privacy" className="text-[var(--ink)] underline">
              Politique de confidentialité
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-[var(--ink)] underline">
              Conditions générales d’utilisation
            </Link>
          </li>
          <li>
            <Link href="/support" className="text-[var(--ink)] underline">
              Support
            </Link>
          </li>
          <li>
            Confidentialité : privacy@ayeba.app · Support : support@ayeba.app · Abus : abuse@ayeba.app
          </li>
        </ul>
      </LegalSection>
    </LegalDocumentShell>
  );
}
