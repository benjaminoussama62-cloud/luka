import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";

export const metadata = {
  title: "Mentions légales — AYEBA",
};

export default function MentionsLegalesPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/legal" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Informations légales
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Mentions légales
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Informations réglementaires relatives au site ayeba.app
          </p>

          <section className="ayeba-panel mt-8 p-6">
            <h2 className="ayeba-kicker ayeba-kicker-accent mb-4">Éditeur du site</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-white">Dénomination</dt>
                <dd className="text-[var(--muted)]">AYEBA</dd>
              </div>
              <div>
                <dt className="text-white">Activité</dt>
                <dd className="text-[var(--muted)]">
                  Moteur de recherche web et services associés (Ayebi, marchés, indexation).
                </dd>
              </div>
              <div>
                <dt className="text-white">Contact</dt>
                <dd className="text-[var(--muted)]">
                  <a href="mailto:contact@ayeba.app" className="text-white underline">
                    contact@ayeba.app
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-white">Domaine</dt>
                <dd className="text-[var(--muted)]">ayeba.app</dd>
              </div>
            </dl>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Directeur de la publication</h2>
            <p className="text-sm text-[var(--muted)]">
              Le directeur de la publication est le représentant légal du projet AYEBA, joignable à
              l&apos;adresse{" "}
              <a href="mailto:contact@ayeba.app" className="text-white underline">
                contact@ayeba.app
              </a>
              .
            </p>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Hébergeur</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-white">Raison sociale</dt>
                <dd className="text-[var(--muted)]">Vercel Inc.</dd>
              </div>
              <div>
                <dt className="text-white">Adresse</dt>
                <dd className="text-[var(--muted)]">
                  440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
                </dd>
              </div>
              <div>
                <dt className="text-white">Site</dt>
                <dd className="text-[var(--muted)]">
                  <a
                    href="https://vercel.com"
                    className="text-white underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    vercel.com
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          <section className="ayeba-panel mt-6 p-6">
            <h2 className="ayeba-kicker mb-4">Propriété intellectuelle</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              L&apos;ensemble des éléments graphiques, textes et logiciels propres à AYEBA est
              protégé. Toute reproduction non autorisée est interdite. Les marques et logos de tiers
              mentionnés appartiennent à leurs propriétaires respectifs.
            </p>
          </section>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            AYEBA · Mentions légales · ayeba.app
          </p>
        </div>
      </div>
    </>
  );
}
