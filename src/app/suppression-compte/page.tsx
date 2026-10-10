import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Suppression de compte — AYEBA",
  description:
    "Procédure de suppression du compte Ayeba et des données associées : demande en ligne ou par e-mail, données effacées, données conservées et délais.",
};

export default function DeleteAccountPage() {
  return (
    <LegalDocumentShell
      title="Suppression de votre compte Ayeba"
      subtitle="Cette page décrit comment demander la suppression définitive de votre compte Ayeba (utilisé par le site ayeba.app et l'application mobile AYEBA) et quelles données sont effacées ou conservées."
      updated="Dernière mise à jour · octobre 2026"
    >
      <LegalSection title="1. Deux moyens de supprimer votre compte">
        <p>
          <strong>En libre-service (recommandé)</strong> : connectez-vous à votre compte, ouvrez{" "}
          <Link href="/compte/securite" className="text-[var(--ink)] underline">
            Compte → Sécurité
          </Link>{" "}
          puis utilisez le bouton « Supprimer mon compte » dans la zone dangereuse. La suppression
          est effective immédiatement et votre session est fermée.
        </p>
        <p>
          <strong>Par e-mail</strong> : écrivez à{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>{" "}
          depuis l'adresse associée au compte avec l'objet « Suppression de compte ». La demande
          est traitée sous 30 jours au plus tard ; une confirmation vous est envoyée.
        </p>
      </LegalSection>

      <LegalSection title="2. Données supprimées">
        <p>La suppression du compte efface définitivement :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>votre identité : nom affiché, adresse e-mail, identifiants de connexion et mot de passe haché ;</li>
          <li>vos paramètres de sécurité : secrets 2FA et codes de secours ;</li>
          <li>vos préférences de compte ;</li>
          <li>les autorisations données aux applications tierces (« Se connecter avec Ayeba »), qui cessent de fonctionner ;</li>
          <li>votre session en cours sur tous vos appareils.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Données conservées ou anonymisées">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Ayeba Mail</strong> : les messages de votre boîte sont supprimés avec le compte ;
            les e-mails déjà délivrés chez des destinataires externes ne peuvent être retirés de
            leurs serveurs.
          </li>
          <li>
            <strong>Contributions publiques Ayebi</strong> : le contenu publié sous licence reste
            visible mais n'est plus rattaché à un compte identifiable.
          </li>
          <li>
            <strong>Journaux techniques</strong> : journaux de serveur et de sécurité anonymisés,
            conservés au maximum 90 jours pour la protection du service puis purgés.
          </li>
          <li>
            <strong>Obligations légales</strong> : les données que la loi impose de conserver
            (facturation éventuelle, lutte contre la fraude) sont limitées au strict nécessaire et
            à la durée légale.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Supprimer une partie seulement">
        <p>
          Sans supprimer le compte, vous pouvez : révoquer les applications connectées depuis{" "}
          <Link href="/compte/applications" className="text-[var(--ink)] underline">
            Compte → Applications
          </Link>
          , désactiver la 2FA, ou effacer les onglets et l'historique locaux de l'application
          mobile (stockés uniquement sur votre appareil).
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>
          Question sur la procédure ou vérification d'une demande :{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>{" "}
          — ou via la{" "}
          <Link href="/support" className="text-[var(--ink)] underline">
            page support
          </Link>
          . Politique complète :{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            ayeba.app/privacy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
