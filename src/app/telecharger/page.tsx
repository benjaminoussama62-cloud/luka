import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Télécharger AYEBA",
  description:
    "AYEBA Browser pour Windows, AYEBA pour iOS et Android. Navigateur complet, moteur de recherche mondial, Ayebi intégré.",
  openGraph: {
    title: "Télécharger AYEBA",
    description: "Windows · App Store · Google Play",
    url: "https://ayeba.app/telecharger",
  },
};

const VERSION = process.env.NEXT_PUBLIC_BROWSER_VERSION || "1.0.5";
const FILENAME = `AYEBA-Setup-${VERSION}.exe`;
const SETUP_URL =
  process.env.NEXT_PUBLIC_BROWSER_SETUP_URL ||
  `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/${FILENAME}`;

const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  "https://play.google.com/store/apps/details?id=app.ayeba.mobile";

const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL || "https://ayeba.app/?app=1";

const FEATURES = [
  {
    title: "Navigateur complet",
    body: "Onglets Chromium, favoris, historique, zoom, impression, recherche sur la page — architecture Edge-like pour Windows.",
  },
  {
    title: "Moteur Ayeba intégré",
    body: "Recherche mondiale par défaut. Google ou Yandex en alternative via Paramètres — Ayebi reste accessible.",
  },
  {
    title: "Ayebi · encyclopédie RDC",
    body: "Wikipedia congolaise, distincte de Wikipédia mondial. Les deux coexistent dans les résultats.",
  },
  {
    title: "Écosystème DevAlpha",
    body: "Raccourcis Jemsa, Sombateka, Omega, Tala, DevAlpha — accès direct depuis le nouvel onglet.",
  },
];

export default function TelechargerPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
            Recherche web
          </Link>
        </header>

        <main className="flex flex-1 flex-col gap-14">
          {/* Windows */}
          <section className="text-center">
            <p className="ayeba-kicker ayeba-kicker-accent">Desktop · Windows 10/11</p>
            <h1 className="mt-3 font-[family-name:var(--font-brand)] text-[clamp(2.2rem,7vw,3.2rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
              AYEBA Browser
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-[1.02rem] leading-relaxed text-[var(--muted)]">
              Navigateur natif Chromium — installateur {FILENAME}. Même logique que Chrome, Edge ou Cursor.
            </p>
            <a
              href={SETUP_URL}
              download={FILENAME}
              className="ayeba-cta mt-8 inline-flex h-14 min-w-[18rem] items-center justify-center px-10 text-base font-semibold"
            >
              Télécharger pour Windows
            </a>
            <p className="mt-3 text-xs text-[var(--faint)]">v{VERSION} · 64 bits · NSIS</p>
          </section>

          {/* Features */}
          <section className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="ayeba-panel p-5 text-left">
                <h2 className="text-base font-semibold text-[var(--ink)]">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
              </article>
            ))}
          </section>

          {/* Mobile — badges officiels Apple / Google */}
          <section id="mobile" className="ayeba-panel p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-md text-left">
                <p className="ayeba-kicker ayeba-kicker-accent">Mobile</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">AYEBA pour iOS & Android</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  Application native Capacitor — recherche Safari-like, onglets, Ayebi permanent. Moteur au choix
                  (Ayeba, Google, Yandex).
                </p>
              </div>
              <div className="flex flex-col items-center gap-4 sm:items-end">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-badge-link"
                  aria-label="Télécharger sur l’App Store"
                >
                  {/* Badge officiel Apple — Marketing Resources */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/store-badges/app-store-fr.svg"
                    alt="Télécharger dans l’App Store"
                    width={156}
                    height={52}
                    className="h-[52px] w-auto"
                  />
                </a>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="store-badge-link"
                  aria-label="Disponible sur Google Play"
                >
                  {/* Badge officiel Google Play */}
                  <Image
                    src="/brand/store-badges/google-play-fr.png"
                    alt="Disponible sur Google Play"
                    width={180}
                    height={52}
                    className="h-[52px] w-auto"
                  />
                </a>
              </div>
            </div>
          </section>

          <p className="text-center text-xs text-[var(--faint)]">
            <a
              href={
                process.env.NEXT_PUBLIC_BROWSER_DOWNLOAD_URL ||
                `https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-${VERSION}.zip`
              }
              className="text-[var(--link)] hover:underline"
            >
              Archive portable ZIP
            </a>
            {" · "}
            <Link href="/mentions-legales" className="text-[var(--link)] hover:underline">
              Confidentialité
            </Link>
          </p>
        </main>

        <div className="mt-12">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
