import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Confidentialité — Ayeba Mail",
  description:
    "Notice de confidentialité spécifique à Ayeba Mail : données de compte, messages, chiffrement, conservation, destinataires et droits.",
};

export default function MailPrivacyPage() {
  return (
    <LegalDocumentShell
      title="Confidentialité — Ayeba Mail"
      subtitle="Cette notice décrit les traitements propres au service de messagerie Ayeba Mail (application Android et interface web). Elle complète la politique de confidentialité générale d’Ayeba, qui prévaut pour tout point non couvert ici."
      updated="Dernière mise à jour · 1 octobre 2026"
    >
      <LegalSection title="1. Périmètre">
        <p>
          Ayeba Mail fournit une boîte de réception sous le domaine ayeba.app, accessible depuis
          l’application Android « Ayeba Mail » et depuis l’interface web. Les traitements décrits
          concernent le compte de messagerie, les messages et les métadonnées techniques associées.
        </p>
        <p>
          Pour les traitements communs à l’ensemble des services (compte Ayeba, recherche,
          journalisation, sous-traitants), se référer à la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité générale
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données de compte">
        <p>
          La création d’une boîte exige un numéro de téléphone, vérifié par un code à usage unique
          envoyé par SMS. Le numéro sert d’identifiant de connexion : aucun mot de passe n’est
          utilisé pour Ayeba Mail.
        </p>
        <p>
          Sont également traités : l’adresse choisie (locale@ayeba.app), le nom affiché, la date de
          naissance déclarée et, si vous la fournissez, une adresse e-mail de récupération. Ces
          éléments servent à l’identification du compte, à sa récupération et au respect des
          conditions d’âge applicables.
        </p>
      </LegalSection>

      <LegalSection title="3. Messages, coffre et pièces jointes">
        <p>
          Ayeba Mail stocke les messages de votre boîte — expéditeur, destinataires, dossier
          (réception, envoyés, brouillons, archives, corbeille) et états (lu, suivi) — pour vous
          les délivrer et vous permettre de les consulter, organiser et supprimer.
        </p>
        <p>
          Une fois le coffre activé, l’objet, le texte et les pièces jointes échangés avec une
          adresse ayeba.app sont chiffrés sur votre appareil (AES-256-GCM). La clé du message est
          enveloppée avec la clé publique du destinataire (ECDH P-256). Ayeba conserve le chiffré
          et ne dispose pas de la phrase secrète ni de la clé privée. Les métadonnées nécessaires
          au routage — adresses, dossier, date, taille — restent lisibles par le système.
        </p>
        <p>
          Un message reçu depuis l’extérieur (Gmail, Outlook, etc.) arrive en clair sur le
          protocole de messagerie. Il est scellé dans votre coffre dès la réception. Les messages
          écrits avant l’activation du coffre sont scellés au moment où vous le créez.
        </p>
        <p>
          La phrase secrète et la clé de récupération ne sont pas connues d’Ayeba. Sans l’une
          d’elles, le contenu chiffré de bout en bout ne peut pas être rétabli.
        </p>
      </LegalSection>

      <LegalSection title="4. Envoi vers des adresses externes">
        <p>
          Lorsque vous écrivez à une adresse extérieure à ayeba.app, vous confirmez que le message
          quitte le coffre. Il est alors remis en clair via les protocoles de messagerie standard
          (SMTP), y compris les pièces jointes, pour que le destinataire puisse le lire. Il est
          traité par les serveurs du destinataire, sur lesquels Ayeba n’a aucun contrôle.
        </p>
        <p>
          Votre copie dans « Envoyés » reste chiffrée dans le coffre. Les messages échangés entre
          adresses ayeba.app ne sortent pas du chiffrement de bout en bout.
        </p>
      </LegalSection>

      <LegalSection title="5. Ce que nous ne faisons pas">
        <p>
          Le contenu de vos messages n’est pas lu pour de la publicité, n’alimente aucun profil
          commercial et n’est pas cédé à des tiers à des fins de marketing. Le texte chiffré de
          bout en bout n’est pas déchiffré par Ayeba.
        </p>
        <p>
          Si vous demandez une traduction, le texte déjà déchiffré sur votre appareil est envoyé
          au service de langue, uniquement pour cette demande.
        </p>
        <p>
          Des traitements automatisés peuvent s’appliquer pour la sécurité et l’intégrité du
          service : anti-abus, limitation d’envoi, détection de comportements techniques anormaux.
        </p>
      </LegalSection>

      <LegalSection title="6. Journalisation technique">
        <p>
          Comme tout service en ligne, Ayeba Mail produit des journaux techniques (adresse IP,
          horodatage, agent utilisateur, erreurs) destinés à la sécurité, au diagnostic et à la
          prévention des abus. Leur durée de conservation est limitée à ce qui est utile à ces
          finalités, sauf incident, litige ou obligation légale.
        </p>
      </LegalSection>

      <LegalSection title="7. Conservation et suppression">
        <p>
          Vos messages sont conservés tant qu’ils demeurent dans votre boîte. La suppression d’un
          message, le vidage de la corbeille ou la clôture du compte entraînent la suppression des
          données associées selon les délais techniques d’exploitation, sauf obligation légale ou
          litige en cours.
        </p>
        <p>
          La clôture du compte de messagerie est sans effet sur les messages déjà remis à des
          correspondants extérieurs, qui relèvent alors de leurs propres systèmes.
        </p>
      </LegalSection>

      <LegalSection title="8. Destinataires et sous-traitants">
        <p>
          Les données sont traitées par les prestataires techniques nécessaires à l’hébergement et
          au stockage de la plateforme. Lorsque l’envoi de SMS ou de courriels externes est activé,
          les prestataires correspondants reçoivent les seules données nécessaires à cette remise
          (numéro de téléphone et code ; destinataire et contenu du message).
        </p>
        <p>
          Ces prestataires agissent selon nos instructions et dans un cadre contractuel de
          protection des données lorsque cela est requis. Ayeba ne vend ni ne loue les données des
          utilisateurs.
        </p>
      </LegalSection>

      <LegalSection title="9. Vos droits">
        <p>
          Vous disposez des droits d’accès, de rectification, d’effacement, d’opposition et de
          limitation décrits sur la page{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>
          , ainsi que du droit de clôturer votre boîte. Les demandes s’adressent à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="10. Modifications">
        <p>
          Toute évolution de cette notice est publiée sur cette page avec une date de mise à jour.
          En cas de changement substantiel, une information est fournie par un moyen approprié
          (notice dans l’application ou message de service).
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
