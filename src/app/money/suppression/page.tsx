import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Supprimer votre portefeuille — Ayeba Money",
  description:
    "Procédure de fermeture du portefeuille Ayeba Money : solde à zéro, demande de fermeture, données supprimées et données conservées pour obligations légales.",
};

export default function MoneyDeletePage() {
  return (
    <LegalDocumentShell
      title="Supprimer votre portefeuille Ayeba Money"
      subtitle="Cette page décrit la suppression de votre portefeuille Ayeba Money (application web, Android et iOS) et de ses données associées. La suppression du portefeuille n’efface pas votre compte Ayeba."
      updated="Dernière mise à jour · 8 octobre 2026"
    >
      <LegalSection title="1. Avant la fermeture">
        <p>
          <b className="text-[var(--ink)]">Solde à zéro.</b> Retirez ou transférez la totalité de
          vos soldes USD et CDF avant de demander la fermeture : un portefeuille avec des fonds ne
          peut pas être clôturé.
        </p>
        <p>
          <b className="text-[var(--ink)]">Opérations en cours.</b> Attendez que les dépôts et
          retraits en attente soient confirmés ou recrédités. Une opération en cours bloque la
          fermeture jusqu’à sa résolution.
        </p>
      </LegalSection>

      <LegalSection title="2. Demander la fermeture">
        <p>
          Écrivez à{" "}
          <a href="mailto:support@ayeba.app" className="text-[var(--ink)] underline">
            support@ayeba.app
          </a>{" "}
          depuis l’adresse e-mail liée à votre compte Ayeba, avec l’objet « Fermeture portefeuille
          Money », ou utilisez le formulaire de la page{" "}
          <Link href="/support" className="text-[var(--ink)] underline">
            Support
          </Link>
          . Nous pouvons vous demander de confirmer par votre code PIN ou un défi de sécurité —
          jamais votre mot de passe.
        </p>
        <p>
          La fermeture est effective sous 72 h après vérification ; vous recevez une confirmation
          par e-mail. Votre portefeuille passe alors au statut fermé : plus aucun mouvement n’est
          possible.
        </p>
      </LegalSection>

      <LegalSection title="3. Données supprimées">
        <p>
          À la fermeture sont supprimés ou anonymisés : le condensat chiffré de votre code PIN,
          votre adresse @pseudo (redevient disponible), et l’association directe entre votre
          profil et le portefeuille.
        </p>
      </LegalSection>

      <LegalSection title="4. Données conservées (obligations légales)">
        <p>
          Le grand livre comptable (transactions, montants, références) et le journal d’audit sont
          conservés jusqu’à 10 ans selon les obligations comptables et de lutte contre la fraude et
          le blanchiment. Ces données historiques sont pseudonymisées au maximum et inaccessibles
          hors des équipes conformité autorisées.
        </p>
        <p>
          Pour exercer vos autres droits (accès, rectification), consultez la page{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>{" "}
          et la{" "}
          <Link href="/privacy/money" className="text-[var(--ink)] underline">
            notice de confidentialité Ayeba Money
          </Link>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
