import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Télécharger AYEBA pour Windows",
  description:
    "Téléchargez AYEBA Browser pour Windows — installateur .exe en un clic, comme Chrome ou Cursor. Gratuit.",
  openGraph: {
    title: "Télécharger AYEBA Browser",
    description: "Installateur Windows (.exe) — navigateur + moteur Ayeba.",
    url: "https://ayeba.app/telecharger",
  },
};

const VERSION = process.env.NEXT_PUBLIC_BROWSER_VERSION || "1.0.4";
const FILENAME = `AYEBA-Setup-${VERSION}.exe`;

/** Lien direct vers l’installateur — même principe que Chrome / Cursor (fichier .exe, pas ZIP). */
const SETUP_URL =
  process.env.NEXT_PUBLIC_BROWSER_SETUP_URL ||
  `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/${FILENAME}`;

export default function TelechargerPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
            Recherche web
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center text-center">
          <p className="ayeba-kicker ayeba-kicker-accent">Windows 10/11 · 64 bits</p>
          <h1 className="mt-4 max-w-lg font-[family-name:var(--font-brand)] text-[clamp(2.4rem,8vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--ink)]">
            Télécharger AYEBA
          </h1>
          <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-[var(--muted)]">
            Un clic — le fichier <strong className="font-medium text-[var(--ink)]">{FILENAME}</strong> se
            télécharge. Double-cliquez pour installer, comme Chrome ou Cursor. Pas de ZIP à extraire.
          </p>

          <a
            href={SETUP_URL}
            download={FILENAME}
            className="ayeba-cta mt-10 inline-flex h-14 min-w-[16rem] items-center justify-center px-10 text-base font-semibold"
          >
            Télécharger pour Windows
          </a>

          <p className="mt-4 text-xs text-[var(--faint)]">
            Version {VERSION} · Installateur NSIS · Navigateur Edge-like + recherche Ayeba
          </p>

          <ol className="mt-12 max-w-md list-decimal space-y-3 px-5 text-left text-[0.9rem] leading-relaxed text-[var(--muted)]">
            <li>Cliquez sur le bouton — le .exe se télécharge (coin bas du navigateur).</li>
            <li>Ouvrez le fichier téléchargé.</li>
            <li>Si Windows SmartScreen s’affiche : « Informations complémentaires » → « Exécuter quand même ».</li>
            <li>Suivez l’assistant — raccourci Bureau + menu Démarrer, AYEBA s’ouvre à la fin.</li>
          </ol>

          <details className="mt-10 w-full max-w-md text-left">
            <summary className="cursor-pointer text-xs text-[var(--faint)] hover:text-[var(--muted)]">
              Options avancées (ZIP portable, sans installateur)
            </summary>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Variante sans installation — extraire le ZIP puis lancer AYEBA.exe :
            </p>
            <a
              href={
                process.env.NEXT_PUBLIC_BROWSER_DOWNLOAD_URL ||
                `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-${VERSION}.zip`
              }
              className="mt-2 inline-block text-sm text-[var(--link)] underline-offset-2 hover:underline"
            >
              AYEBA-Portable-{VERSION}.zip
            </a>
          </details>

          <section className="mt-14 w-full max-w-md rounded-2xl border border-[var(--line)] bg-white/[0.03] p-6 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink)]">Mobile</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Sur téléphone : <strong className="text-[var(--ink)]">ayeba.app</strong> → « Ajouter à l’écran
              d’accueil ». Ayebi (encyclopédie RDC) et Wikipédia (mondial) restent deux sources distinctes dans
              les résultats.
            </p>
            <Link href="/?app=1" className="ayeba-ghost mt-4 inline-flex px-4 py-2 text-xs">
              Ouvrir l’app mobile
            </Link>
          </section>
        </main>

        <div className="mt-16">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
