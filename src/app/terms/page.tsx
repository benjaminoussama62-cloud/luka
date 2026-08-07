import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";

export const metadata = {
  title: "Conditions générales d'utilisation — AYEBA",
};

export default function TermsPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/legal" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Informations légales
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Conditions générales d&apos;utilisation
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            En utilisant AYEBA (ayeba.app), vous acceptez les présentes conditions.
          </p>

          <section className="ayeba-panel mt-8 p-6">
            <h2 className="ayeba-kicker ayeba-kicker-accent mb-4">Objet du service</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              AYEBA fournit un moteur de recherche web, des résultats enrichis (images, marchés,
              encyclopédie Ayebi) et des outils associés. Le service est fourni « en l&apos;état »,
              sans garantie d&apos; exhaustivité ou d&apos;exactitude des résultats indexés.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Usage autorisé</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Recherche personnelle et professionnelle licite.</li>
              <li>Respect des limites de débit et des interfaces documentées (API, OpenSearch).</li>
              <li>Interdiction de scraping abusif, d&apos;attaque ou de contournement des mesures de sécurité.</li>
              <li>Interdiction d&apos;usage contraire à la loi ou aux droits de tiers.</li>
            </ul>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Comptes utilisateur</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Vous êtes responsable de la confidentialité de vos identifiants. AYEBA se réserve le
              droit de suspendre un compte en cas d&apos;usage frauduleux, de spam ou de violation
              manifeste des présentes CGU.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Propriété intellectuelle</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              La marque AYEBA, l&apos;interface et les algorithmes propres restent la propriété de
              l&apos;éditeur. Les contenus indexés appartiennent à leurs auteurs respectifs ; AYEBA
              affiche des extraits et liens dans le cadre du droit de citation et de l&apos;indexation
              web.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Limitation de responsabilité</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              AYEBA ne garantit pas la disponibilité continue du service. Les résultats proviennent
              de sources tierces ; vérifiez les informations sensibles (santé, juridique, financier)
              auprès de sources officielles.
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Modifications</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Les présentes CGU peuvent être mises à jour. La date de dernière révision sera indiquée
              sur cette page. L&apos;usage continu du service vaut acceptation des modifications.
            </p>
          </section>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            AYEBA · CGU · ayeba.app
          </p>
        </div>
      </div>
    </>
  );
}
