import type { Metadata } from "next";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Mentions légales — AYEBA",
  description: "Mentions légales du site ayeba.app : éditeur, hébergeur, contact et propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocumentShell
      title="Mentions légales"
      subtitle="Informations réglementaires relatives à l’édition et à l’hébergement du site ayeba.app."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Éditeur du site">
        <dl className="space-y-4">
          <div>
            <dt className="text-[var(--ink)] font-medium">Dénomination</dt>
            <dd>AYEBA</dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Activité</dt>
            <dd>
              Édition d’un moteur de recherche web et de services associés (encyclopédie Ayebi,
              marchés, Studio pour éditeurs, fournisseur d’identité pour applications partenaires).
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Site</dt>
            <dd>
              <a href="https://ayeba.app" className="text-[var(--ink)] underline">
                https://ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Contact général</dt>
            <dd>
              <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
                contact@ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Contact juridique</dt>
            <dd>
              <a href="mailto:legal@ayeba.app" className="text-[var(--ink)] underline">
                legal@ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Protection des données</dt>
            <dd>
              <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
                privacy@ayeba.app
              </a>
            </dd>
          </div>
        </dl>
      </LegalSection>

      <LegalSection title="2. Directeur de la publication">
        <p>
          Le directeur de la publication est le représentant légal du projet Ayeba, joignable aux
          adresses de contact ci-dessus. Toute demande relative au contenu éditorial du site peut
          lui être adressée.
        </p>
      </LegalSection>

      <LegalSection title="3. Hébergement">
        <dl className="space-y-4">
          <div>
            <dt className="text-[var(--ink)] font-medium">Hébergeur applicatif</dt>
            <dd>Vercel Inc.</dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Adresse</dt>
            <dd>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</dd>
          </div>
          <div>
            <dt className="text-[var(--ink)] font-medium">Site</dt>
            <dd>
              <a
                href="https://vercel.com"
                className="text-[var(--ink)] underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://vercel.com
              </a>
            </dd>
          </div>
        </dl>
        <p>
          Des prestataires techniques complémentaires (base de données, DNS, messagerie) peuvent
          intervenir pour le fonctionnement du service. Les détails contractuels sont tenus à la
          disposition des autorités compétentes sur demande motivée.
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          L’ensemble des éléments constitutifs du site Ayeba (textes, interfaces, marques,
          logiciels) est protégé par le droit de la propriété intellectuelle. Toute reproduction,
          représentation ou adaptation non autorisée est interdite, hors exceptions légales.
        </p>
        <p>
          Les marques, logos et contenus de tiers mentionnés ou indexés demeurent la propriété de
          leurs titulaires respectifs. Leur présence dans les résultats de recherche n’implique
          aucune affiliation sauf mention contraire.
        </p>
      </LegalSection>

      <LegalSection title="5. Signalement de contenu">
        <p>
          Pour signaler un contenu illicite, une usurpation ou une URL à retirer de l’index,
          contactez{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>{" "}
          ou{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>{" "}
          en précisant l’URL concernée et les motifs du signalement.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
