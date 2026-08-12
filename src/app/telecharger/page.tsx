import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Télécharger AYEBA pour Windows",
  description: "Téléchargez AYEBA Browser pour Windows. Gratuit.",
  openGraph: {
    title: "Télécharger AYEBA Browser",
    description: "Le navigateur Ayeba pour Windows. Gratuit.",
    url: "https://ayeba.app/telecharger",
  },
};

const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_BROWSER_DOWNLOAD_URL ||
  "https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-1.0.2.zip";

const VERSION = process.env.NEXT_PUBLIC_BROWSER_VERSION || "1.0.2";

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
            Le navigateur conçu pour chercher avec Ayeba
          </h1>

          <p className="mt-5 max-w-md text-[1.02rem] leading-relaxed text-[var(--muted)]">
            Rapide, gratuit, et centré sur la recherche mondiale Ayeba.
          </p>

          <a
            href={DOWNLOAD_URL}
            className="ayeba-cta mt-10 inline-flex h-12 items-center justify-center px-9 text-sm"
          >
            Télécharger pour Windows
          </a>

          <p className="mt-4 text-xs text-[var(--faint)]">
            Pour Windows 10/11 · 64 bits · Version {VERSION}
          </p>

          <p className="mt-10 max-w-sm text-[0.78rem] leading-relaxed text-[var(--faint)]">
            En téléchargeant, vous obtenez le fichier officiel depuis GitHub Releases. Si Windows
            affiche SmartScreen : Informations complémentaires → Exécuter quand même.
          </p>
        </main>

        <div className="mt-20">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
