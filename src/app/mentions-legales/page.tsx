import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentShell, LegalSection } from "@/components/legal/LegalDocumentShell";

export const metadata: Metadata = {
  title: "Mentions légales — AYEBA",
  description:
    "Mentions légales d’ayeba.app : éditeur, contacts, hébergement, propriété intellectuelle, signalement et responsabilité.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalDocumentShell
      title="Mentions légales"
      subtitle="Les présentes mentions informent le public sur l’identité de l’éditeur du site ayeba.app, les modalités de contact, l’hébergement du service et les règles essentielles de propriété intellectuelle."
      updated="Dernière mise à jour · 29 août 2026"
    >
      <LegalSection title="1. Éditeur du site">
        <p>
          Le site <strong>ayeba.app</strong> est édité sous la dénomination <strong>AYEBA</strong>.
          Ayeba propose un moteur de recherche web ainsi que des services associés : encyclopédie
          collaborative Ayebi, informations de marchés, outils Studio destinés aux éditeurs de
          sites, et un service d’identité permettant à des applications partenaires d’offrir une
          connexion via le compte Ayeba.
        </p>
        <p>
          Le site public principal est{" "}
          <a href="https://ayeba.app" className="text-[var(--ink)] underline">
            https://ayeba.app
          </a>
          . Toute correspondance officielle relative à l’édition du site doit être adressée aux
          contacts ci-dessous. Les demandes hors sujet (spam commercial non sollicité, chaînes
          frauduleuses) peuvent être ignorées.
        </p>
        <dl className="space-y-3">
          <div>
            <dt className="font-medium text-[var(--ink)]">Contact général</dt>
            <dd>
              <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
                contact@ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Contact juridique</dt>
            <dd>
              <a href="mailto:legal@ayeba.app" className="text-[var(--ink)] underline">
                legal@ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Protection des données</dt>
            <dd>
              <a href="mailto:privacy@ayeba.app" className="text-[var(--ink)] underline">
                privacy@ayeba.app
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--ink)]">Signalement d’abus</dt>
            <dd>
              <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
                abuse@ayeba.app
              </a>
            </dd>
          </div>
        </dl>
        <p>
          Les informations d’immatriculation complémentaires (forme juridique détaillée, numéro
          d’enregistrement, adresse postale complète) sont communiquées aux autorités compétentes
          et aux personnes justifiant d’un intérêt légitime, conformément au droit applicable. Elles
          peuvent être mises à jour sur cette page dès qu’elles sont stabilisées pour publication.
        </p>
      </LegalSection>

      <LegalSection title="2. Directeur de la publication">
        <p>
          Le directeur de la publication est le représentant légal du projet Ayeba. Il assume la
          responsabilité éditoriale des contenus propres au site dans les limites prévues par la
          loi. Les contenus indexés provenant de sites tiers restent sous la responsabilité de
          leurs auteurs et éditeurs d’origine.
        </p>
        <p>
          Toute demande relative au contenu éditorial d’Ayeba (pages institutionnelles, interface,
          textes de politique) peut lui être adressée via legal@ayeba.app ou contact@ayeba.app. Les
          demandes concernant un contenu web tiers indexé doivent préciser l’URL exacte et le
          fondement du signalement.
        </p>
      </LegalSection>

      <LegalSection title="3. Hébergement">
        <p>
          L’hébergement applicatif du site ayeba.app est assuré par <strong>Vercel Inc.</strong>,
          440 N Barranca Ave #4133, Covina, CA 91723, États-Unis —{" "}
          <a
            href="https://vercel.com"
            className="text-[var(--ink)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            vercel.com
          </a>
          .
        </p>
        <p>
          Des prestataires techniques complémentaires peuvent intervenir pour le DNS, la base de
          données, la messagerie transactionnelle ou la répartition de charge. Ces interventions
          sont limitées au fonctionnement du service. Les détails contractuels complets ne sont pas
          exposés publiquement ; ils demeurent disponibles pour les autorités sur demande motivée.
        </p>
        <p>
          L’utilisateur reconnaît que la disponibilité du service dépend notamment de ces
          infrastructures. Les interruptions de maintenance ou incidents d’hébergeur font partie
          des aléas techniques d’un service en ligne.
        </p>
      </LegalSection>

      <LegalSection title="4. Propriété intellectuelle">
        <p>
          La marque Ayeba, les éléments graphiques, l’architecture logicielle, les textes
          institutionnels et les interfaces du site sont protégés par le droit de la propriété
          intellectuelle. Toute reproduction, représentation, adaptation ou exploitation non
          autorisée est interdite, hors exceptions légales (citation courte, usage privé non
          commercial dans les limites du droit, etc.).
        </p>
        <p>
          Les logos et dénominations de tiers éventuellement affichés (fournisseurs de connexion,
          sites indexés, partenaires) appartiennent à leurs titulaires. Leur apparition dans
          l’interface ou dans les résultats de recherche n’implique pas nécessairement une
          relation commerciale ou un partenariat officiel.
        </p>
        <p>
          Les contenus Ayebi contributifs peuvent être soumis à des licences ou règles
          spécifiques rappelées sur les pages Ayebi concernées. En cas de conflit entre une licence
          de contribution et les présentes mentions, la règle la plus spécifique à la zone Ayebi
          prévaut pour ce contenu.
        </p>
      </LegalSection>

      <LegalSection title="5. Contenu indexé et responsabilité">
        <p>
          Ayeba affiche des liens et extraits provenant de sources externes. L’éditeur d’Ayeba ne
          contrôle pas l’intégralité du web et ne peut garantir l’exactitude, la légalité ou la
          permanence de chaque page tierce. La présence d’un résultat ne signifie pas une
          validation éditoriale du contenu cible.
        </p>
        <p>
          Si vous estimez qu’un contenu indexé porte atteinte à vos droits, signalez-le avec l’URL
          précise. Ayeba examinera le signalement et pourra retirer, limiter ou contextualiser
          l’affichage lorsque cela est justifié, sans que cela constitue une reconnaissance de
          responsabilité sur le fond du contenu tiers.
        </p>
      </LegalSection>

      <LegalSection title="6. Signalement de contenu illicite ou abusif">
        <p>
          Pour signaler un contenu illicite, une usurpation d’identité, un phishing abusant de la
          marque Ayeba, ou une URL à retirer de l’index, contactez{" "}
          <a href="mailto:abuse@ayeba.app" className="text-[var(--ink)] underline">
            abuse@ayeba.app
          </a>{" "}
          ou{" "}
          <a href="mailto:contact@ayeba.app" className="text-[var(--ink)] underline">
            contact@ayeba.app
          </a>
          .
        </p>
        <p>
          Votre message doit contenir : l’URL concernée, une description factuelle du problème, la
          date de constatation, et vos coordonnées de suivi. Les signalements anonymes sans élément
          vérifiable peuvent ne pas aboutir.
        </p>
      </LegalSection>

      <LegalSection title="7. Données personnelles">
        <p>
          Les traitements de données personnelles sont décrits dans la{" "}
          <Link href="/privacy" className="text-[var(--ink)] underline">
            politique de confidentialité
          </Link>
          . L’exercice des droits est expliqué sur{" "}
          <Link href="/droits" className="text-[var(--ink)] underline">
            ayeba.app/droits
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Droit applicable">
        <p>
          Les présentes mentions sont interprétées conformément au droit applicable à l’éditeur,
          sous réserve des dispositions impératives protectrices des utilisateurs. Pour toute
          question juridique relative au site : legal@ayeba.app.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
