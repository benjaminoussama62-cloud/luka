import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Confidentialité — Ayeba Money",
  description:
    "Notice de confidentialité spécifique à Ayeba Money : portefeuille, transactions, code PIN, partenaires de paiement, conservation et droits.",
};

export default function MoneyPrivacyPage() {
  return (
    <LegalDocumentShell
      title="Confidentialité — Ayeba Money"
      subtitle="Ayeba Money est un produit distinct de l’écosystème Ayeba : cette notice décrit les traitements propres au portefeuille (soldes, transactions, code PIN, retraits). Elle complète la politique de confidentialité générale d’Ayeba, qui prévaut pour tout point non couvert ici."
      updated="Dernière mise à jour · 8 octobre 2026"
    >
      <LegalSection title="1. Périmètre">
        <p>
          Ayeba Money fournit un portefeuille virtuel en USD et CDF accessible depuis
          ayeba.app/money, l’application web installable (PWA) et les applications mobiles
          Android et iOS. Les traitements décrits concernent le portefeuille, les soldes, les
          transactions, le code PIN et les échanges avec les partenaires de paiement.
        </p>
        <p>
          Pour les traitements communs à l’écosystème (compte Ayeba, journalisation technique,
          sous-traitants), se référer à la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité générale
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données traitées">
        <p>
          <b className="text-[var(--ink)]">Portefeuille.</b> Identifiant du compte Ayeba associé,
          adresse facultative (@pseudo), statut du portefeuille (actif, gelé, fermé) et dates de
          création.
        </p>
        <p>
          <b className="text-[var(--ink)]">Code PIN.</b> Votre code PIN à 4 chiffres n’est jamais
          stocké ni transmis en clair : seul un condensat cryptographique (bcrypt + secret
          serveur) est conservé. Il est demandé pour chaque envoi ou retrait et les tentatives
          erronées sont comptabilisées pour verrouiller temporairement le portefeuille.
        </p>
        <p>
          <b className="text-[var(--ink)]">Transactions.</b> Chaque mouvement produit une écriture
          comptable immuable : montant, devise, sens, portefeuilles concernés, statut, référence
          du partenaire éventuel et horodatage. Ce journal est la seule source fiable des soldes
          et ne peut pas être modifié.
        </p>
        <p>
          <b className="text-[var(--ink)]">Sécurité et audit.</b> Adresse IP, agent utilisateur et
          actions sensibles (changement de PIN, verrouillage, gel administrateur, envois)
          alimentent un journal d’audit destiné à détecter la fraude et à répondre aux obligations
          de sécurité.
        </p>
        <p>
          <b className="text-[var(--ink)]">Notifications.</b> Un e-mail de confirmation est envoyé
          à l’adresse de votre compte à chaque mouvement (envoi, réception, dépôt, retrait,
          échec). Il ne contient jamais votre PIN ni vos secrets, uniquement la référence, le
          montant et le statut de l’opération.
        </p>
      </LegalSection>

      <LegalSection title="3. Partenaires de paiement">
        <p>
          Les dépôts et retraits passent par des partenaires de paiement externes (Mobile Money
          via Flash et/ou CinetPay). Pour exécuter l’opération, leur sont transmis : le numéro de
          téléphone Mobile Money, le montant, la devise et une référence technique. Ces
          partenaires traitent vos données sous leur propre politique de confidentialité.
        </p>
        <p>
          Les notifications de résultat (webhooks) envoyées par les partenaires sont vérifiées par
          signature cryptographique ; les messages de confirmation sont conservés pour traçabilité
          et résolution de litige.
        </p>
      </LegalSection>

      <LegalSection title="4. Accès interne et gel">
        <p>
          Un portefeuille peut être gelé par les administrateurs habilités (suspicion de fraude,
          demande des autorités, protection du titulaire). Chaque gel ou dégel est motivé, journalisé
          dans l’audit et notifié au titulaire par e-mail. Les soldes affichés dans les outils
          d’administration ne donnent jamais accès à votre PIN.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservation">
        <p>
          Le journal des transactions et les journaux d’audit financiers sont conservés pour la
          durée exigée par les obligations comptables et de lutte contre la fraude (jusqu’à 10 ans
          après la clôture du portefeuille selon la réglementation applicable). Cette conservation
          s’impose même après suppression de votre compte : les montants et références de
          transactions passées ne peuvent pas être effacés.
        </p>
        <p>
          Le condensat du PIN et l’adresse @pseudo peuvent être supprimés ou anonymisés à la
          fermeture du portefeuille, sans affecter le journal comptable.
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Vous conservez les droits décrits dans la page{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>{" "}
          : accès, rectification, opposition. L’effacement du portefeuille suit la procédure de la
          page{" "}
          <Link href="/money/suppression" className="text-[var(--ink)] underline">
            Suppression du compte Money
          </Link>
          , sous réserve des durées de conservation légales ci-dessus. Contact :{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
