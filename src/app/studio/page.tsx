import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Ayeba Studio — infrastructure pour webmasters",
  description:
    "Radar, Trace, Yield, Velocity, Aether : la plateforme Ayeba pour indexer, mesurer, monétiser et accélérer votre site.",
  openGraph: {
    title: "Ayeba Studio",
    description: "Présence dans le moteur Ayeba — données réelles, actions claires.",
    url: "https://ayeba.app/studio",
  },
};

const MODULES = [
  {
    name: "Radar",
    status: "Disponible",
    live: true,
    text: "Indexation, requêtes, clics, couverture et inspection d’URL dans le moteur Ayeba.",
  },
  {
    name: "Trace",
    status: "Disponible",
    live: true,
    text: "Audience et comportement sur votre site — sessions, pages vues, referrers et snippet de suivi.",
  },
  {
    name: "Yield",
    status: "Disponible",
    live: true,
    text: "Monétisation native Ayeba — emplacements, CTR, revenus et activation par slot.",
  },
  {
    name: "Velocity",
    status: "Disponible",
    live: true,
    text: "Audits de vitesse TTFB, score performance et plan d’action priorisé.",
  },
  {
    name: "Aether",
    status: "Disponible",
    live: true,
    text: "Copilote qui lit Radar, Trace, Yield et Velocity — 3 actions à fort impact.",
  },
];

export default function StudioLandingPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
              Recherche
            </Link>
            <Link href="/studio/app" className="ayeba-cta px-4 py-2 text-xs">
              Ouvrir Studio
            </Link>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <p className="ayeba-kicker ayeba-kicker-accent">Ayeba Studio</p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-brand)] text-[clamp(2.6rem,9vw,4.8rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[var(--ink)]">
            L’infrastructure du web pour ceux qui publient.
          </h1>
          <p className="mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-[var(--muted)]">
            Pas un tableau décoratif. Studio vous dit si Ayeba voit votre site, qui visite vos pages,
            comment monétiser, si c’est rapide — et quelle action faire maintenant avec Aether.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/studio/app" className="ayeba-cta inline-flex h-12 items-center justify-center px-8 text-sm">
              Entrer dans Studio
            </Link>
            <Link
              href="/ayebi/connexion?redirect=/studio/app"
              className="ayeba-ghost inline-flex h-12 items-center justify-center px-5 text-sm"
            >
              Se connecter
            </Link>
          </div>

          <section className="mt-16 grid gap-6 border-t border-[var(--line)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <article key={m.name} className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-[family-name:var(--font-brand)] text-2xl font-semibold text-[var(--ink)]">
                    {m.name}
                  </h2>
                  <span
                    className={`text-[10px] uppercase tracking-[0.14em] ${
                      m.live ? "text-[var(--accent)]" : "text-[var(--faint)]"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{m.text}</p>
              </article>
            ))}
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
