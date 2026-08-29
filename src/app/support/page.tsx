import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Support — AYEBA",
  description:
    "Centre d’aide Ayeba : compte, recherche, indexation, applications connectées, signalements, confidentialité et délais de traitement.",
};

export default function SupportPage() {
  return (
    <LegalDocumentShell
      title="Support"
      subtitle="Ce centre d’aide explique comment obtenir de l’assistance sur Ayeba, quels éléments transmettre pour accélérer le traitement, et quels canaux utiliser selon la nature de votre demande. Il ne remplace pas les documents légaux, mais oriente vers la bonne procédure."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Avant de contacter le support">
        <p>
          Beaucoup de situations se résolvent sans ticket : vérifiez d’abord que vous êtes bien
          connecté au bon compte, que le navigateur n’est pas en mode privé avec cookies bloqués,
          et que la page{" "}
          <Link href="/status" className="text-[var(--ink)] underline">
            Statut
          </Link>{" "}
          n’indique pas d’incident en cours. Pour les applications connectées, ouvrez{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications connectées
          </Link>{" "}
          afin de contrôler les accès déjà accordés.
        </p>
        <p>
          Si le problème concerne un résultat de recherche ou une page manquante, préparez l’URL
          exacte et une capture d’écran datée. Si le problème concerne la connexion, précisez la
          méthode utilisée (e-mail, Google, GitHub, Microsoft) sans jamais envoyer votre mot de
          passe, code 2FA ou secret d’application dans le message.
        </p>
        <p>
          Les demandes anonymes, incomplètes ou formulées de façon injurieuse peuvent être
          différées ou refusées. Une demande claire, factuelle et limitée à un seul sujet est
          traitée plus rapidement.
        </p>
      </LegalSection>

      <LegalSection title="2. Compte et connexion">
        <p>
          Pour toute difficulté d’accès au compte Ayeba (impossible de se connecter, session
          expirée, confusion entre plusieurs adresses e-mail, activation ou perte d’accès à la
          double authentification), contactez{" "}
          <a href="mailto:support@ayeba.app" className="text-[var(--ink)] underline">
            support@ayeba.app
          </a>
          . Indiquez l’adresse e-mail associée au compte, la date approximative du dernier accès
          réussi, le navigateur utilisé et une description précise de l’erreur affichée.
        </p>
        <p>
          Nous ne demandons jamais votre mot de passe par e-mail. Si un message prétend venir
          d’Ayeba et vous invite à saisir vos identifiants sur une page inhabituelle, ne cliquez
          pas et transmettez l’URL suspecte à{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>
          . En cas de suspicion d’accès non autorisé, changez immédiatement votre mot de passe
          depuis un appareil de confiance, révoquez les applications connectées inutiles, puis
          écrivez à support et security.
        </p>
        <p>
          Les préférences de compte, l’historique de recherche lié au compte et les paramètres de
          sécurité se gèrent depuis{" "}
          <Link href="/compte" className="text-[var(--ink)] underline">
            ayeba.app/compte
          </Link>
          . Le support peut vous guider, mais ne peut pas contourner les contrôles destinés à
          protéger votre identité contre une usurpation.
        </p>
      </LegalSection>

      <LegalSection title="3. Recherche, résultats et indexation">
        <p>
          Ayeba indexe des contenus publics et affiche des résultats issus de sources variées. Si
          une page importante n’apparaît pas, si un extrait est obsolète, trompeur ou si vous
          souhaitez signaler un résultat qui porte atteinte à vos droits, écrivez à{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>{" "}
          avec l’URL concernée, la requête utilisée et le motif du signalement.
        </p>
        <p>
          Les éditeurs de sites web peuvent suivre la présence de leur domaine dans le moteur via{" "}
          <Link href="/studio" className="text-[var(--ink)] underline">
            Ayeba Studio
          </Link>
          , lorsque le module correspondant est disponible pour leur compte. Une demande de retrait
          ou de mise à jour d’URL sera examinée au regard du droit applicable, des directives
          d’exploration et de la nature publique du contenu.
        </p>
        <p>
          Ayeba ne garantit pas qu’une page soit indexée immédiatement ni qu’un classement reste
          stable. Le support peut expliquer les principes généraux et enregistrer un signalement ;
          il ne vend pas de placement privilégié dans les résultats de recherche.
        </p>
      </LegalSection>

      <LegalSection title="4. Abus, phishing et incidents de sécurité">
        <p>
          Utilisez{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>{" "}
          pour signaler un usage abusif du service, du spam via des espaces contributifs, une
          usurpation de la marque Ayeba, ou des pages qui imitent frauduleusement notre interface
          afin de voler des identifiants.
        </p>
        <p>
          Utilisez{" "}
          <a href="mailto:security@ayeba.app" className="text-[var(--ink)] underline">
            security@ayeba.app
          </a>{" "}
          pour une suspicion d’incident touchant un compte, une application OAuth que vous éditez,
          ou une vulnérabilité découverte de bonne foi. Joignez l’URL, l’heure (avec fuseau), le
          navigateur, et des captures si disponibles. Ne publiez pas de preuve d’exploitation sur
          des forums publics avant d’avoir laissé un délai raisonnable de traitement.
        </p>
        <p>
          Les signalements de sécurité sont prioritaires. Nous accusons réception lorsque cela est
          possible et pouvons demander des précisions. Aucune récompense automatique n’est promise ;
          les contributions responsables sont toutefois prises au sérieux.
        </p>
        <p>
          Ce canal n’est pas destiné aux demandes commerciales génériques ni aux questions de
          recherche courantes. Les messages hors sujet seront réorientés ou classés sans réponse
          détaillée.
        </p>
      </LegalSection>

      <LegalSection title="5. Confidentialité et exercice des droits">
        <p>
          Pour exercer un droit relatif à vos données personnelles (accès, rectification,
          effacement, opposition, limitation, portabilité dans les conditions légales), écrivez à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Décrivez précisément la demande, l’adresse e-mail du compte concerné, et toute
          information permettant de vérifier que vous êtes bien la personne concernée.
        </p>
        <p>
          Une synthèse pédagogique de vos droits est disponible sur{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            ayeba.app/droits
          </Link>
          . La description complète des traitements figure dans la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité
          </Link>
          . Le support ne divulgue pas de données à un tiers qui ne justifie pas son identité ou
          son mandat.
        </p>
        <p>
          Les délais de réponse suivent les exigences réglementaires applicables. Si une demande
          est manifestement excessive, répétitive ou infondée, nous pouvons la refuser ou la
          facturer dans les limites prévues par la loi, après information.
        </p>
      </LegalSection>

      <LegalSection title="6. Développeurs et applications connectées">
        <p>
          Les éditeurs d’applications qui intègrent « Se connecter avec Ayeba » doivent passer par
          la{" "}
          <Link href="/developers/console" className="text-[var(--ink)] underline">
            console OAuth
          </Link>{" "}
          pour obtenir leurs identifiants, gérer les redirect URIs et régénérer un secret
          compromis. La documentation d’intégration et la politique d’accès sont publiées sur{" "}
          <Link href="/developers" className="text-[var(--ink)] underline">
            /developers
          </Link>
          .
        </p>
        <p>
          Pour une question d’intégration ou une demande de vérification d’application, contactez{" "}
          <a href="mailto:developers@ayeba.app" className="text-[var(--ink)] underline">
            developers@ayeba.app
          </a>
          . Ne joignez pas de secrets en clair dans un fil d’e-mail non sécurisé si une rotation
          depuis la console est possible. Les utilisateurs finaux qui souhaitent retirer l’accès
          d’une application le font depuis leur compte, pas via ce canal développeur.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilité du service et incidents majeurs">
        <p>
          L’état opérationnel du service est consultable sur{" "}
          <Link href="/status" className="text-[var(--ink)] underline">
            ayeba.app/status
          </Link>
          . En cas d’incident majeur affectant la recherche, l’authentification ou les API
          d’identité, cette page est mise à jour en priorité.
        </p>
        <p>
          Pendant un incident, multipliez les tickets identiques n’accélère pas le rétablissement.
          Indiquez plutôt l’heure de début constatée, votre région approximative et le message
          d’erreur exact. Après rétablissement, certains symptômes locaux (cache navigateur,
          ancienne session) peuvent nécessiter une déconnexion/reconnexion.
        </p>
      </LegalSection>

      <LegalSection title="8. Délais de réponse et priorités">
        <p>
          Nous visons une première réponse sous quelques jours ouvrés pour les demandes standard
          (compte, indexation, questions générales). Les signalements d’abus et de sécurité sont
          traités en priorité. Les demandes juridiques ou relatives aux données personnelles
          respectent les délais légaux applicables.
        </p>
        <p>
          Le volume de messages, les jours fériés et la nécessité de vérifier une identité peuvent
          allonger le délai. Une réponse peut consister en une demande de complément
          d’information ; tant que ce complément n’est pas fourni, le dossier peut rester en
          attente.
        </p>
        <p>
          Ayeba est un service en évolution. Le support fournit une assistance de bonne foi, sans
          engagement de résolution immédiate pour chaque cas, sous réserve des obligations légales
          qui s’imposent à l’éditeur.
        </p>
      </LegalSection>

      <LegalSection title="9. Langues et contacts utiles">
        <p>
          Les échanges se font principalement en français. Un message clair en anglais peut être
          accepté lorsque cela facilite le traitement. Contacts principaux :
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Support compte :{" "}
            <a href="mailto:support@ayeba.app" className="text-[var(--ink)] underline">
              support@ayeba.app
            </a>
          </li>
          <li>
            Contact général / indexation :{" "}
            <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
              contact@ayeba.app
            </a>
          </li>
          <li>
            Confidentialité :{" "}
            <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
              privacy@ayeba.app
            </a>
          </li>
          <li>
            Abus :{" "}
            <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
              abuse@ayeba.app
            </a>
          </li>
          <li>
            Sécurité :{" "}
            <a href="mailto:security@ayeba.app" className="text-[var(--ink)] underline">
              security@ayeba.app
            </a>
          </li>
          <li>
            Développeurs :{" "}
            <a href="mailto:developers@ayeba.app" className="text-[var(--ink)] underline">
              developers@ayeba.app
            </a>
          </li>
          <li>
            Juridique :{" "}
            <a href="mailto:legal@ayeba.app" className="text-[var(--ink)] underline">
              legal@ayeba.app
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalDocumentShell>
  );
}
