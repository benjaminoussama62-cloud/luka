import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation — AYEBA",
  description:
    "Conditions d’utilisation d’Ayeba : service, compte, usages interdits, propriété intellectuelle, responsabilité et contacts.",
};

export default function TermsPage() {
  return (
    <LegalDocumentShell
      title="Conditions générales d’utilisation"
      subtitle="Les présentes conditions régissent l’accès et l’utilisation du site ayeba.app, du compte Ayeba et des services associés. En utilisant le service, vous acceptez ces conditions."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Acceptation et capacité">
        <p>
          L’accès au service suppose l’acceptation pleine et entière des présentes conditions. Si
          vous n’acceptez pas ces conditions, vous devez cesser d’utiliser Ayeba. L’utilisation au
          nom d’une personne morale suppose que vous disposez du pouvoir d’engager cette
          organisation.
        </p>
        <p>
          Vous devez avoir la capacité juridique requise dans votre pays pour contracter. Si vous
          êtes mineur, l’usage du service doit s’effectuer sous la responsabilité d’un titulaire de
          l’autorité parentale, conformément au droit local.
        </p>
      </LegalSection>

      <LegalSection title="2. Description du service">
        <p>
          Ayeba fournit un moteur de recherche web, des résultats enrichis (actualités, images,
          marchés, contenus Ayebi) et des outils destinés aux utilisateurs et aux éditeurs
          (notamment Studio). Un service d’identité permet également à des applications
          autorisées de proposer une connexion via le compte Ayeba.
        </p>
        <p>
          Le service évolue. Des fonctionnalités peuvent être ajoutées, modifiées, suspendues ou
          retirées pour des raisons techniques, légales ou produit. Sauf obligation contraire,
          ces évolutions ne créent pas un droit à indemnisation.
        </p>
        <p>
          Les résultats de recherche reposent sur des contenus indexés et, le cas échéant, sur des
          sources ou prestataires externes. Ayeba ne garantit ni l’exhaustivité, ni l’exactitude
          permanente, ni l’actualité de chaque résultat. Pour toute décision sensible (santé,
          juridique, financière, sécurité), vérifiez auprès de sources officielles ou de
          professionnels compétents.
        </p>
      </LegalSection>

      <LegalSection title="3. Compte utilisateur">
        <p>
          Vous êtes responsable de l’exactitude des informations fournies lors de l’inscription et
          de la confidentialité de vos identifiants. Toute activité réalisée via votre compte est
          présumée effectuée sous votre responsabilité, sauf preuve contraire d’un accès
          frauduleux non imputable à une négligence de votre part.
        </p>
        <p>
          Vous vous engagez à informer sans délai le support en cas de suspicion d’accès non
          autorisé. Ayeba peut suspendre ou clôturer un compte en cas d’usage frauduleux, d’abus
          technique, de spam, d’atteinte à la sécurité d’autrui, ou de violation manifeste des
          présentes conditions, après examen des faits et, lorsque possible, information préalable.
        </p>
        <p>
          La double authentification, lorsqu’elle est proposée, constitue une mesure fortement
          recommandée. Son activation ou désactivation relève de votre responsabilité d’utilisateur
          du compte.
        </p>
      </LegalSection>

      <LegalSection title="4. Usages autorisés">
        <p>
          Vous pouvez utiliser Ayeba pour une recherche personnelle ou professionnelle licite,
          consulter les résultats, contribuer aux espaces prévus à cet effet dans le respect des
          règles locales, et utiliser les interfaces documentées de manière raisonnable.
        </p>
        <p>
          Les éditeurs de sites peuvent utiliser Studio et les outils d’indexation pour comprendre
          la présence de leur contenu dans le moteur, sans contourner les contrôles d’accès ni
          usurper l’identité d’un tiers.
        </p>
      </LegalSection>

      <LegalSection title="5. Usages interdits">
        <p>Sont notamment interdits, sans exhaustivité :</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>les attaques, tentatives d’intrusion, contournement des contrôles d’accès ;</li>
          <li>l’extraction automatisée abusive, le déni de service ou la surcharge artificielle ;</li>
          <li>la publication de contenus illicites via les espaces contributifs ;</li>
          <li>l’usurpation d’identité et l’usage trompeur de la marque Ayeba ;</li>
          <li>toute activité contraire à la loi ou aux droits de tiers.</li>
        </ul>
        <p>
          En cas de manquement, Ayeba peut prendre des mesures proportionnées : avertissement,
          limitation d’accès, suspension, signalement aux autorités lorsque la loi l’exige.
        </p>
      </LegalSection>

      <LegalSection title="6. Applications connectées et développeurs">
        <p>
          Les développeurs qui intègrent « Se connecter avec Ayeba » doivent respecter la{" "}
          <Link href="/developers/policy" className="text-[var(--ink)] underline">
            politique développeurs
          </Link>
          , enregistrer leurs applications de bonne foi, protéger leurs secrets et n’utiliser les
          données que pour les finalités déclarées et consenties.
        </p>
        <p>
          Les utilisateurs restent libres d’autoriser ou de révoquer l’accès des applications à
          leur compte. Ayeba n’est pas responsable des traitements effectués par un éditeur tiers
          après transmission légitime des données, sous réserve de ses propres obligations en tant
          que fournisseur d’identité.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <p>
          La marque Ayeba, l’interface, les logiciels et les éléments graphiques propres au service
          sont protégés. Toute reproduction non autorisée est interdite. Les contenus indexés
          appartiennent à leurs auteurs ; Ayeba affiche des liens et extraits dans le cadre de
          l’indexation et du droit applicable.
        </p>
        <p>
          Vous vous interdisez d’utiliser les marques Ayeba d’une manière susceptible de créer une
          confusion sur l’origine d’un service, sauf autorisation écrite préalable.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilité et limitation de responsabilité">
        <p>
          Ayeba s’efforce d’assurer une disponibilité continue, sans engagement de résultat absolu.
          Le service peut connaître des interruptions pour maintenance, incident, force majeure ou
          cause externe. Une page de statut peut informer des incidents majeurs.
        </p>
        <p>
          Dans les limites autorisées par la loi, Ayeba ne saurait être tenu responsable des
          dommages indirects, pertes de chance, pertes de données ou préjudices résultant de
          l’usage des résultats de recherche, d’une décision prise sur la base de ces résultats, ou
          d’une indisponibilité temporaire.
        </p>
        <p>
          Rien dans les présentes conditions n’exclut la responsabilité qui ne peut légalement être
          exclue (notamment en cas de faute lourde ou de dispositions impératives protectrices du
          consommateur).
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité
          </Link>
          . L’exercice des droits est détaillé sur{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            ayeba.app/droits
          </Link>
          . En utilisant le service, vous reconnaissez avoir pu prendre connaissance de ces
          documents.
        </p>
      </LegalSection>

      <LegalSection title="10. Modifications des conditions">
        <p>
          Ayeba peut modifier les présentes conditions pour tenir compte de l’évolution du service
          ou du droit. La date de mise à jour figure en tête de page. En cas de changement
          substantiel, une information pourra être portée à la connaissance des utilisateurs
          connectés.
        </p>
        <p>
          L’usage continu du service après publication d’une nouvelle version vaut acceptation de
          celle-ci, sous réserve des droits impératifs dont vous disposez. Si vous n’acceptez pas
          une modification, vous devez cesser d’utiliser le service et, le cas échéant, demander
          la clôture de votre compte.
        </p>
      </LegalSection>

      <LegalSection title="11. Droit applicable et contact">
        <p>
          Les présentes conditions sont régies par le droit applicable au siège de l’éditeur, sous
          réserve des dispositions impératives protectrices du consommateur. En cas de litige, une
          solution amiable sera recherchée avant toute action judiciaire.
        </p>
        <p>
          Contact juridique :{" "}
          <a href="mailto:legal@ayeba.app" className="text-[var(--ink)] underline">
            legal@ayeba.app
          </a>
          . Support :{" "}
          <Link href="/support" className="text-[var(--ink)] underline">
            ayeba.app/support
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
