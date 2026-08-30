import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Télécharger AYEBA",
  description: "Navigateur Windows (Edge-like) et app mobile (Safari-like). Moteur Ayeba, Ayebi toujours accessible.",
  openGraph: {
    title: "Télécharger AYEBA Browser",
    description: "Installez le navigateur Ayeba pour Windows. Gratuit.",
    url: "https://ayeba.app/telecharger",
  },
};

const VERSION = process.env.NEXT_PUBLIC_BROWSER_VERSION || "1.0.4";

const SETUP_URL =
  process.env.NEXT_PUBLIC_BROWSER_SETUP_URL ||
  `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Setup-${VERSION}.exe`;

const PORTABLE_URL =
  process.env.NEXT_PUBLIC_BROWSER_DOWNLOAD_URL ||
  `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-${VERSION}.zip`;

export default function TelechargerPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-16 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
            Recherche web
          </Link>
        </header>

        <main className="flex flex-1 flex-col items-center text-center">
          <h1 className="max-w-lg font-[family-name:var(--font-brand)] text-[clamp(2.2rem,7vw,3.4rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--ink)]">
            AYEBA — navigateur + recherche
          </h1>

          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-[var(--muted)]">
            PC : navigateur Edge-like avec Ayeba par défaut. Mobile : expérience Safari-like — Google ou Yandex
            au choix, Ayebi toujours là.
          </p>

          <section className="mt-12 w-full max-w-md text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink)]">Windows (PC)</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Onglets Chromium, barre d’adresse, favoris, paramètres moteur (Ayeba · Google · Yandex).
            </p>
          </section>

          <a
            href={SETUP_URL}
            className="ayeba-cta mt-10 inline-flex h-12 items-center justify-center px-9 text-sm"
          >
            Télécharger l’installateur
          </a>

          <p className="mt-4 text-xs text-[var(--faint)]">
            Windows 10/11 · 64 bits · Version {VERSION} · AYEBA-Setup-{VERSION}.exe
          </p>

          <ol className="mt-10 max-w-md list-decimal space-y-2 px-5 text-left text-[0.86rem] leading-relaxed text-[var(--muted)]">
            <li>Ouvre le fichier téléchargé</li>
            <li>Si SmartScreen apparaît : Informations complémentaires → Exécuter quand même</li>
            <li>Suis l’assistant — AYEBA s’ouvre ensuite tout seul</li>
          </ol>

          <p className="mt-8 text-[0.78rem] text-[var(--faint)]">
            Variante portable (ZIP) :{" "}
            <a href={PORTABLE_URL} className="text-[var(--link)] underline-offset-2 hover:underline">
              AYEBA-Portable-{VERSION}.zip
            </a>
          </p>

          <section className="mt-14 w-full max-w-md rounded-2xl border border-[var(--line)] bg-white/[0.03] p-6 text-left">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--ink)]">Mobile (Safari-like)</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Sur téléphone : ouvrez <strong className="text-[var(--ink)]">ayeba.app</strong> → menu navigateur
              → « Ajouter à l’écran d’accueil » (Safari iOS / Chrome Android). L’app combine recherche + onglets
              + bouton Ayebi permanent.
            </p>
            <Link href="/?app=1" className="ayeba-ghost mt-4 inline-flex px-4 py-2 text-xs">
              Ouvrir l’app mobile
            </Link>
          </section>
        </main>

        <div className="mt-20">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
