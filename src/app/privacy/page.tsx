import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité — AYEBA",
  description:
    "Politique de confidentialité Ayeba : traitements, finalités, conservation, destinataires, droits des personnes et sécurité.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentShell
      title="Politique de confidentialité"
      subtitle="La présente politique explique quelles catégories de données Ayeba traite, pour quelles finalités, pendant combien de temps, avec qui elles peuvent être partagées, et quels droits vous pouvez exercer. Elle s’applique au site ayeba.app et aux services associés (recherche, compte, Ayebi, Studio, identité pour applications autorisées)."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est l’éditeur du service Ayeba. Pour toute question relative
          à cette politique ou à vos données :{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Contact général :{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          . Site :{" "}
          <a href="https://ayeba.app" className="text-[var(--ink)] underline">
            https://ayeba.app
          </a>
          .
        </p>
        <p>
          Selon la nature de votre demande, le message peut être orienté vers le support compte,
          l’équipe juridique ou le canal sécurité, afin d’être traité par la personne compétente.
        </p>
      </LegalSection>

      <LegalSection title="2. Principes de protection">
        <p>
          Ayeba applique les principes de minimisation, de finalité déterminée et de conservation
          limitée. Nous collectons ce qui est nécessaire au fonctionnement du moteur de recherche,
          à la sécurité des comptes, à l’exécution des services demandés, et au respect des
          obligations légales.
        </p>
        <p>
          Ayeba ne vend pas vos requêtes de recherche à des annonceurs et n’exploite pas de
          publicité comportementale ciblée sur le service de recherche. Les améliorations de
          pertinence s’appuient prioritairement sur des signaux agrégés ou anonymisés lorsque cela
          est possible.
        </p>
        <p>
          Les bases légales mobilisées selon les cas sont : exécution du service (compte,
          recherche, Studio), intérêt légitime (sécurité, prévention des abus, mesure d’audience
          non intrusive), obligation légale, et consentement lorsque requis (connexion sociale,
          autorisation d’une application tierce, certains cookies non essentiels).
        </p>
      </LegalSection>

      <LegalSection title="3. Données liées à la recherche">
        <p>
          Lorsque vous effectuez une recherche, Ayeba traite les termes saisis, éventuellement le
          filtre ou la langue choisis, ainsi que des métadonnées techniques usuelles d’une requête
          HTTP (adresse IP, agent utilisateur, horodatage, référent éventuel). Ces éléments
          permettent de fournir le service, de le sécuriser et de diagnostiquer des erreurs.
        </p>
        <p>
          Des signaux d’interaction (par exemple un clic sur un résultat) peuvent être enregistrés
          sous forme limitée afin d’améliorer la qualité des résultats. Lorsque ces signaux sont
          agrégés, ils ne sont plus destinés à vous identifier nominalement.
        </p>
        <p>
          Les durées de conservation des journaux techniques sont limitées à ce qui est utile à la
          sécurité et à l’exploitation. Elles peuvent être prolongées en cas d’incident, de litige
          ou d’obligation légale.
        </p>
      </LegalSection>

      <LegalSection title="4. Compte Ayeba et authentification">
        <p>
          La création d’un compte ou la connexion via un fournisseur d’identité tiers implique le
          traitement de données d’identification : nom affiché, adresse e-mail, identifiant fourni
          par le prestataire, date de création, et préférences de compte. Ces données servent à
          authentifier l’utilisateur, à personnaliser l’expérience et à sécuriser l’accès.
        </p>
        <p>
          Lorsqu’un mot de passe est défini côté Ayeba, il est stocké sous forme hachée. Ayeba ne
          conserve pas de mot de passe en clair. Vous pouvez activer une authentification à deux
          facteurs depuis votre espace sécurité afin de réduire le risque d’accès frauduleux.
        </p>
        <p>
          Un cookie de session sécurisé peut être déposé après connexion. Il est nécessaire au
          maintien de la session et n’est pas utilisé à des fins publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="5. « Se connecter avec Ayeba »">
        <p>
          Si vous autorisez une application à utiliser votre compte Ayeba, celle-ci reçoit
          uniquement les informations correspondant aux permissions que vous avez acceptées sur
          l’écran de consentement. L’autorisation est enregistrée afin de permettre le
          fonctionnement du service et de vous permettre de la révoquer ultérieurement.
        </p>
        <p>
          Vous pouvez retirer l’accès à tout moment depuis{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications connectées
          </Link>
          . La révocation empêche de nouveaux accès via Ayeba. Les données déjà détenues par
          l’éditeur tiers relèvent de la responsabilité de cet éditeur.
        </p>
        <p>
          Les développeurs sont soumis à une politique d’accès distincte. Ayeba peut suspendre une
          application en cas d’abus, de tromperie ou de non-respect des règles applicables.
        </p>
      </LegalSection>

      <LegalSection title="6. Indexation web et contenus publics">
        <p>
          Ayeba explore et indexe des pages publiquement accessibles, dans le respect des
          directives robots et des bonnes pratiques d’exploration. Les extraits affichés dans les
          résultats proviennent de sources externes. Ces contenus ne deviennent pas pour autant la
          propriété d’Ayeba.
        </p>
        <p>
          Les éditeurs peuvent demander une mise à jour, une non-indexation ou un retrait motivé
          via contact@ayeba.app. Les demandes seront examinées au regard du droit applicable et de
          la nature publique du contenu.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies et stockage local">
        <p>
          Outre le cookie de session, Ayeba peut mémoriser localement des préférences (langue,
          marché, options d’interface) afin d’éviter de vous les redemander à chaque visite. Vous
          pouvez supprimer ces éléments via les paramètres de votre navigateur.
        </p>
        <p>
          Aucun cookie publicitaire tiers n’est déposé par défaut sur le moteur de recherche. Si
          des traceurs non essentiels étaient introduits ultérieurement, une information adaptée
          serait fournie.
        </p>
      </LegalSection>

      <LegalSection title="8. Destinataires et sous-traitants">
        <p>
          Les données peuvent être traitées par des prestataires techniques nécessaires à
          l’hébergement, au stockage, à l’envoi d’e-mails de service ou à la sécurité. Ces
          prestataires agissent selon nos instructions et dans un cadre contractuel de protection
          des données lorsque cela est requis.
        </p>
        <p>
          Ayeba ne cède pas de fichiers d’utilisateurs à des fins commerciales. Une communication
          peut intervenir si la loi l’exige, ou pour protéger les droits, la sécurité et
          l’intégrité du service et de ses utilisateurs.
        </p>
      </LegalSection>

      <LegalSection title="9. Transferts et localisation">
        <p>
          Selon l’architecture d’hébergement, certaines données peuvent être traitées dans des
          infrastructures situées hors de votre pays de résidence. Dans ce cas, Ayeba s’attache à
          mettre en place des garanties appropriées prévues par la réglementation applicable.
        </p>
        <p>
          Des détails complémentaires peuvent être communiqués sur demande motivée adressée à
          privacy@ayeba.app, dans la limite de ce qui peut être divulgué sans compromettre la
          sécurité du service.
        </p>
      </LegalSection>

      <LegalSection title="10. Vos droits">
        <p>
          Vous disposez notamment des droits d’accès, de rectification, d’effacement, de
          limitation, d’opposition et de portabilité, dans les conditions prévues par la
          réglementation. Vous pouvez également introduire une réclamation auprès de l’autorité de
          protection des données compétente.
        </p>
        <p>
          Pour exercer vos droits :{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Une synthèse opérationnelle est publiée sur{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            ayeba.app/droits
          </Link>
          . Une vérification d’identité peut être demandée afin d’éviter toute divulgation ou
          suppression abusive.
        </p>
      </LegalSection>

      <LegalSection title="11. Sécurité">
        <p>
          Ayeba met en œuvre des mesures techniques et organisationnelles destinées à protéger les
          comptes et les données contre l’accès non autorisé, la perte accidentelle ou
          l’altération. Ces mesures incluent notamment le contrôle d’accès aux environnements,
          le chiffrement des échanges via HTTPS sur le site public, le stockage sécurisé des
          secrets, et des procédures de réponse aux incidents.
        </p>
        <p>
          Aucun système n’étant infaillible, nous vous recommandons un mot de passe unique et
          robuste, ainsi que l’activation de la double authentification lorsque disponible. En cas
          de suspicion d’accès non autorisé, changez vos identifiants, révoquez les applications
          inutiles et contactez security@ayeba.app ainsi que support@ayeba.app.
        </p>
        <p>
          Pour des raisons de sécurité, Ayeba ne publie pas le détail opérationnel de son
          architecture de défense, de ses seuils de filtrage ou de ses procédures internes
          d’investigation. Ces informations sont réservées aux besoins légitimes de conformité et
          aux autorités compétentes.
        </p>
      </LegalSection>

      <LegalSection title="12. Conservation">
        <p>
          Les données de compte sont conservées tant que le compte est actif, puis pendant une
          durée limitée après clôture si une obligation ou un intérêt légitime de conservation
          existe (litige, fraude, obligation légale). Les journaux techniques ont des durées plus
          courtes, sauf prolongation justifiée.
        </p>
        <p>
          À l’issue des durées applicables, les données sont supprimées, anonymisées ou archivées
          sous une forme ne permettant plus une identification directe, selon les cas.
        </p>
      </LegalSection>

      <LegalSection title="13. Modifications">
        <p>
          Cette politique peut être mise à jour pour refléter l’évolution du service, des
          prestataires ou des obligations légales. La date de mise à jour figure en tête de page.
          En cas de modification substantielle, les utilisateurs connectés pourront être informés
          par un moyen approprié (bandeau, e-mail de service, ou notice dans le compte).
        </p>
        <p>
          Nous vous invitons à consulter régulièrement cette page. L’usage continu du service après
          mise à jour vaut prise de connaissance de la version publiée, sous réserve des droits
          impératifs dont vous disposez.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
