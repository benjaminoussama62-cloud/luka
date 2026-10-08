import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Conditions d’utilisation — Ayeba Money",
  description:
    "Conditions propres à Ayeba Money : portefeuille virtuel, transferts internes, dépôts et retraits via partenaires, code PIN, limites et responsabilités.",
};

export default function MoneyTermsPage() {
  return (
    <LegalDocumentShell
      title="Conditions d’utilisation — Ayeba Money"
      subtitle="Ayeba Money est un produit distinct de l’écosystème Ayeba. Les présentes conditions régissent le portefeuille, les soldes, les transferts internes, les dépôts et les retraits. Elles complètent les conditions générales d’utilisation d’Ayeba."
      updated="Dernière mise à jour · 8 octobre 2026"
    >
      <LegalSection title="1. Nature du service">
        <p>
          Ayeba Money est un portefeuille virtuel rattaché à votre compte Ayeba. Les soldes
          affichés en USD et CDF représentent des créances sur les fonds détenus par Ayeba auprès
          de ses partenaires de paiement agréés. Ayeba Money n’est pas une banque : aucun intérêt,
          découvert ni crédit n’est proposé.
        </p>
        <p>
          Les transferts entre utilisateurs de l’écosystème sont des écritures internes
          instantanées et gratuites : aucun fonds réel ne circule entre les portefeuilles, les
          soldes sont ajustés dans un grand livre comptable sécurisé.
        </p>
      </LegalSection>

      <LegalSection title="2. Code PIN et sécurité du compte">
        <p>
          Un code PIN à 4 chiffres est obligatoire pour tout envoi ou retrait. Il est stocké sous
          forme de condensat chiffré et est exigé à chaque mouvement, même avec une session active.
          Vous êtes responsable de sa confidentialité : ne le communiquez à personne, y compris à
          des personnes se présentant comme le support.
        </p>
        <p>
          Après plusieurs tentatives erronées, le portefeuille se verrouille temporairement par
          sécurité. En cas de suspicion d’accès non autorisé, changez immédiatement votre mot de
          passe Ayeba puis votre PIN, et contactez le support.
        </p>
      </LegalSection>

      <LegalSection title="3. Dépôts et retraits">
        <p>
          Les dépôts (Mobile Money) sont initiés depuis l’application puis confirmés par un
          partenaire de paiement. Votre solde n’est crédité qu’après réception d’une confirmation
          signée du partenaire : l’affichage d’un succès sur votre téléphone ne constitue pas en
          soi un crédit.
        </p>
        <p>
          Les retraits débitent immédiatement votre solde virtuel, puis le partenaire exécute le
          versement vers votre compte Mobile Money. En cas d’échec du versement, le montant est
          recrédité automatiquement et intégralement ; vous êtes notifié par e-mail dans tous les
          cas.
        </p>
        <p>
          Des frais ou limites peuvent être appliqués par les partenaires ou par les opérateurs
          Mobile Money : ils sont indépendants des transferts internes, qui restent gratuits.
        </p>
      </LegalSection>

      <LegalSection title="4. Usages interdits">
        <p>
          Il est interdit d’utiliser Ayeba Money pour le blanchiment, le financement du
          terrorisme, la fraude, les jeux de hasard interdits, la revente de services de paiement
          ou toute activité contraire à la loi applicable. Ayeba peut suspendre ou geler un
          portefeuille en cas de suspicion, conformément à la procédure de gel (motif, audit,
          notification).
        </p>
      </LegalSection>

      <LegalSection title="5. Disponibilité et responsabilité">
        <p>
          Le service est fourni dans les limites d’une obligation de moyens. Ayeba ne répond pas
          des indisponibilités des partenaires de paiement, des réseaux Mobile Money, ni des
          erreurs de saisie du destinataire ou du montant. En cas d’écart détecté, la
          réconciliation du grand livre fait foi ; toute anomalie fait l’objet d’une alerte et
          d’une correction auditée, jamais silencieuse.
        </p>
      </LegalSection>

      <LegalSection title="6. Fermeture">
        <p>
          Vous pouvez demander la fermeture de votre portefeuille à tout moment selon la procédure
          de la page{" "}
          <Link href="/money/suppression" className="text-[var(--ink)] underline">
            Suppression du compte Money
          </Link>
          . Le solde restant doit être retiré au préalable. La fermeture du portefeuille ne supprime
          pas votre compte Ayeba ; les écritures comptables passées sont conservées selon les durées
          légales.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
