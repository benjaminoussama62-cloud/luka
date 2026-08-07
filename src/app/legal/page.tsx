import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";

export const metadata = {
  title: "Informations légales — AYEBA",
};

export default function LegalHubPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Accueil
          </Link>

          <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl text-white">
            Informations légales
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            AYEBA est un moteur de recherche indépendant, sans publicité, avec priorité silencieuse
            pour la République démocratique du Congo.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link href="/privacy" className="ayeba-panel block p-5 transition hover:border-white/20">
              <h2 className="ayeba-kicker ayeba-kicker-accent mb-2">Confidentialité</h2>
              <p className="text-sm text-[var(--muted)]">
                Données collectées, cookies, indexation et droits des utilisateurs.
              </p>
            </Link>
            <Link href="/terms" className="ayeba-panel block p-5 transition hover:border-white/20">
              <h2 className="ayeba-kicker mb-2">Conditions d&apos;utilisation</h2>
              <p className="text-sm text-[var(--muted)]">
                Règles d&apos;usage du service de recherche et des comptes.
              </p>
            </Link>
            <Link
              href="/mentions-legales"
              className="ayeba-panel block p-5 transition hover:border-white/20"
            >
              <h2 className="ayeba-kicker mb-2">Mentions légales</h2>
              <p className="text-sm text-[var(--muted)]">
                Éditeur, hébergement et contact officiel du domaine ayeba.app.
              </p>
            </Link>
          </div>

          <p className="mt-8 text-center text-xs text-[var(--faint)]">
            AYEBA · ayeba.app · Projet indépendant
          </p>
        </div>
      </div>
    </>
  );
}
