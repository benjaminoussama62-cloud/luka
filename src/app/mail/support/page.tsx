import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Support — Ayeba Mail",
  description:
    "Assistance Ayeba Mail : compte @ayeba.app, coffre chiffré, envoi et réception, pièces jointes, application mobile et contact de l'équipe.",
};

export default function MailSupportPage() {
  return (
    <LegalDocumentShell
      title="Support — Ayeba Mail"
      subtitle="Centre d'assistance dédié à Ayeba Mail : votre adresse @ayeba.app, le coffre chiffré, l'envoi et la réception, l'application mobile. Pour les autres produits Ayeba, consultez le centre d'aide général."
      updated="Dernière mise à jour · 17 novembre 2026"
    >
      <LegalSection title="1. Votre compte @ayeba.app">
        <p>
          L'adresse @ayeba.app se crée depuis l'application ou depuis{" "}
          <Link href="/mail/signup" className="text-[var(--ink)] underline">
            ayeba.app/mail/signup
          </Link>
          . La création exige une vérification par téléphone : si le code n'arrive pas, patientez
          deux minutes avant de demander un renvoi, et vérifiez le format international du numéro.
        </p>
        <p>
          Pour la connexion, utilisez l'adresse complète (par exemple{" "}
          <em>prenom@ayeba.app</em>) et votre mot de passe. En cas d'oubli, contactez-nous — nous ne
          demanderons jamais votre mot de passe, votre phrase secrète ni votre clé de récupération
          dans nos échanges.
        </p>
      </LegalSection>

      <LegalSection title="2. Le coffre chiffré (très important)">
        <p>
          Le coffre chiffre vos messages sur votre appareil (AES-256, enveloppe hybride
          ECDH + ML-KEM-768). Votre <strong>phrase secrète</strong> et votre{" "}
          <strong>clé de récupération</strong> sont les seules clés : elles ne transitent jamais par
          nos serveurs et nous ne pouvons pas les régénérer.
        </p>
        <p>
          <strong>Si vous perdez à la fois la phrase secrète et la clé de récupération, les
          messages déjà chiffrés sont définitivement illisibles</strong> — y compris pour nous.
          Conservez la clé de récupération hors ligne, sur un support séparé de votre téléphone.
        </p>
        <p>
          Vous pouvez changer la phrase secrète depuis les réglages du coffre tant que vous
          connaissez l'actuelle. Une boîte peut être déverrouillée sur plusieurs appareils avec la
          même phrase.
        </p>
      </LegalSection>

      <LegalSection title="3. Envoyer, recevoir, pièces jointes">
        <p>
          Vous écrivez à toute adresse email du monde et recevez les messages externes dans votre
          boîte @ayeba.app. Entre adresses @ayeba.app, la remise est instantanée et chiffrée de
          bout en bout quand les deux coffres sont ouverts.
        </p>
        <p>
          Pièces jointes : jusqu'à 3 fichiers par message. Un message marqué « envoyé » vers
          l'extérieur peut mettre quelques instants à apparaître chez le destinataire — c'est le
          délai normal du courrier électronique, pas une panne. Si un destinataire n'existe pas ou
          refuse le message, un avis d'échec est déposé dans votre boîte.
        </p>
        <p>
          Les codes de vérification et reçus des applications de l'écosystème (TALA, SombaTeka,
          OMEGA, Mbongo) arrivent dans la boîte de réception avec l'identité de l'application —
          un code détecté se copie en un geste depuis le lecteur.
        </p>
      </LegalSection>

      <LegalSection title="4. Application mobile et notifications">
        <p>
          Ayeba Mail est disponible sur Android et iOS. L'interface est embarquée : l'application
          s'ouvre et reste utilisable sans réseau ; vos messages partent dès que la connexion
          revient. Les notifications push signalent les nouveaux messages — vérifiez qu'elles sont
          autorisées dans les réglages du téléphone si rien n'arrive.
        </p>
        <p>
          Après une réinstallation ou un changement de téléphone, reconnectez-vous avec la même
          adresse puis déverrouillez le coffre avec votre phrase secrète pour retrouver vos
          messages chiffrés.
        </p>
      </LegalSection>

      <LegalSection title="5. Nous contacter">
        <p>
          Écrivez à{" "}
          <a href="mailto:support@ayeba.app" className="text-[var(--ink)] underline">
            support@ayeba.app
          </a>{" "}
          depuis votre adresse @ayeba.app quand c'est possible — cela accélère l'identification du
          compte. Précisez l'adresse concernée, l'appareil et la version de l'application, et
          décrivez l'erreur affichée (capture d'écran bienvenue). Ne joignez jamais votre phrase
          secrète, votre clé de récupération ou un code de vérification.
        </p>
        <p>
          Avant d'écrire : vérifiez la page{" "}
          <Link href="/status" className="text-[var(--ink)] underline">
            Statut
          </Link>{" "}
          pour un incident en cours. Pour signaler un abus (hameçonnage, usurpation) :{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
