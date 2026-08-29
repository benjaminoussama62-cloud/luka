import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Support — AYEBA",
  description: "Aide et contact Ayeba : compte, recherche, développeurs, signalements et sécurité.",
};

export default function SupportPage() {
  return (
    <LegalDocumentShell
      title="Support"
      subtitle="Nous traitons les demandes liées au compte, à la recherche, aux applications connectées et aux signalements. Choisissez le canal adapté pour une réponse plus rapide."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Compte et connexion">
        <p>
          Problème de connexion, récupération d’accès, double authentification, applications
          connectées : utilisez d’abord{" "}
          <Link href="/compte" className="text-[var(--ink)] underline">
            votre compte
          </Link>
          , puis écrivez à{" "}
          <a href="mailto:support@ayeba.app" className="text-[var(--ink)] underline">
            support@ayeba.app
          </a>{" "}
          en précisant l’adresse e-mail du compte (sans envoyer de mot de passe).
        </p>
      </LegalSection>

      <LegalSection title="2. Recherche et indexation">
        <p>
          Pour une URL manquante, un résultat trompeur ou une demande de retrait d’indexation,
          indiquez l’URL exacte et le motif à{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          . Les éditeurs disposant de Studio peuvent également vérifier la couverture de leur site
          depuis{" "}
          <Link href="/studio" className="text-[var(--ink)] underline">
            Ayeba Studio
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Développeurs et OAuth">
        <p>
          Documentation, console et politique d’accès pour les applications :{" "}
          <Link href="/developers" className="text-[var(--ink)] underline">
            ayeba.app/developers
          </Link>
          . Les demandes de vérification d’application et questions d’intégration :{" "}
          <a href="mailto:developers@ayeba.app" className="text-[var(--ink)] underline">
            developers@ayeba.app
          </a>
          . Ne transmettez jamais un client_secret par e-mail non chiffré si vous pouvez le faire
          autrement ; privilégiez la rotation depuis la console.
        </p>
      </LegalSection>

      <LegalSection title="4. Abus et sécurité">
        <p>
          Signalement d’abus, phishing abusant de la marque Ayeba, ou suspicion d’incident de
          sécurité :{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>{" "}
          /{" "}
          <a href="mailto:security@ayeba.app" className="text-[var(--ink)] underline">
            security@ayeba.app
          </a>
          . Joignez captures, URL et horodatage lorsque possible.
        </p>
      </LegalSection>

      <LegalSection title="5. Confidentialité et droits">
        <p>
          Exercice des droits RGPD :{" "}
          <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
            privacy@ayeba.app
          </a>
          . Synthèse :{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            Vos droits
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Disponibilité du service">
        <p>
          Consultez l’état du service sur{" "}
          <Link href="/status" className="text-[var(--ink)] underline">
            ayeba.app/status
          </Link>
          . En cas d’incident majeur, les informations seront mises à jour sur cette page.
        </p>
      </LegalSection>

      <LegalSection title="7. Délais de réponse">
        <p>
          Nous visons une première réponse sous quelques jours ouvrés pour les demandes
          standard. Les signalements de sécurité et d’abus sont priorisés. Les demandes incomplètes
          ou sans élément vérifiable peuvent nécessiter un complément d’information.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
