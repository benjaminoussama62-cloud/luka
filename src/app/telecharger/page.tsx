import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Télécharger AYEBA pour Windows",
  description:
    "Navigateur Ayeba pour Windows — onglets réels, recherche mondiale, design haut de gamme. Téléchargement gratuit.",
  openGraph: {
    title: "Télécharger AYEBA Browser",
    description: "Le navigateur Ayeba pour Windows. Gratuit.",
    url: "https://ayeba.app/telecharger",
  },
};

/** Stable release asset — updated when a new browser build is published. */
const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_BROWSER_DOWNLOAD_URL ||
  "https://github.com/benjaminoussama62-cloud/luka/releases/latest/download/AYEBA-Portable-1.0.0.zip";

const VERSION = process.env.NEXT_PUBLIC_BROWSER_VERSION || "1.0.0";

const FEATURES = [
  {
    title: "Onglets réels",
    text: "Comme Edge : chaque site s’ouvre dans un vrai moteur Chromium, pas une iframe bridée.",
  },
  {
    title: "Recherche Ayeba",
    text: "Barre d’adresse intelligente — URL directe ou requête mondiale via ayeba.app.",
  },
  {
    title: "Raccourcis DevAlpha",
    text: "JEMSA, SombaTeka, DevAlpha1, TALA prêts dès le nouvel onglet.",
  },
  {
    title: "Menu complet",
    text: "Favoris, historique, zoom, recherche dans la page, impression, données effaçables.",
  },
];

export default function TelechargerPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
            Recherche web
          </Link>
        </header>

        <main className="flex flex-1 flex-col">
          <p className="ayeba-kicker ayeba-kicker-accent">Windows · gratuit</p>
          <h1 className="mt-3 font-[family-name:var(--font-brand)] text-[clamp(2.4rem,8vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-[var(--ink)]">
            AYEBA Browser
          </h1>
          <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-[var(--muted)]">
            Le navigateur Ayeba pour tout le monde : onglets type Edge, vitesse Chromium, et la recherche Ayeba au
            centre. Installez-le une fois — accessible hors navigateur web.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={DOWNLOAD_URL}
              className="ayeba-cta inline-flex h-12 items-center justify-center px-7 text-sm"
            >
              Télécharger pour Windows
            </a>
            <p className="text-xs text-[var(--faint)]">
              Version {VERSION} · ZIP portable · Windows 10/11 x64 · ~130 Mo
            </p>
          </div>

          <ol className="mt-6 max-w-xl list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
            <li>Téléchargez le ZIP, puis extrayez-le (clic droit → Extraire tout).</li>
            <li>
              Ouvrez le dossier <strong className="text-[var(--ink)]">AYEBA-Portable-{VERSION}</strong> et
              lancez <strong className="text-[var(--ink)]">AYEBA.exe</strong>.
            </li>
            <li>
              Si SmartScreen apparaît : <em>Informations complémentaires</em> →{" "}
              <em>Exécuter quand même</em>.
            </li>
          </ol>

          <p className="mt-4 max-w-lg text-[0.78rem] leading-relaxed text-[var(--faint)]">
            L’avertissement SmartScreen est normal tant que l’app n’a pas de certificat de signature Windows payant.
            Le fichier vient du dépôt officiel Ayeba / GitHub Releases.
          </p>

          <section className="mt-14 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="ayeba-panel p-5">
                <h2 className="font-[family-name:var(--font-brand)] text-lg font-semibold text-[var(--ink)]">
                  {f.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{f.text}</p>
              </article>
            ))}
          </section>

          <section className="ayeba-panel mt-8 p-5">
            <h2 className="font-[family-name:var(--font-brand)] text-lg font-semibold text-[var(--ink)]">
              Configuration
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Windows 10 ou 11 (64 bits)</li>
              <li>~200 Mo d’espace disque</li>
              <li>Connexion Internet pour la recherche et les sites</li>
            </ul>
          </section>

          <p className="mt-10 text-center text-sm text-[var(--faint)]">
            Déjà installé ? Ouvrez <strong className="text-[var(--muted)]">AYEBA</strong> depuis le menu Démarrer ou
            le bureau.
          </p>
        </main>

        <div className="mt-12">
          <SiteFooter />
        </div>
      </div>
    </>
  );
}
