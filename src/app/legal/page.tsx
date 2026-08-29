import type { Metadata } from "next";
import Link from "next/link";
import { GradientStage } from "@/components/effects/GradientStage";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { SiteFooter } from "@/components/search/SiteFooter";

export const metadata: Metadata = {
  title: "Informations légales — AYEBA",
  description:
    "Confidentialité, CGU, mentions légales, droits des utilisateurs et support Ayeba.",
};

const LINKS = [
  {
    href: "/privacy",
    title: "Confidentialité",
    text: "Collecte, finalités, conservation et protection des données personnelles.",
  },
  {
    href: "/terms",
    title: "Conditions d’utilisation",
    text: "Règles d’usage du moteur, des comptes et des services associés.",
  },
  {
    href: "/mentions-legales",
    title: "Mentions légales",
    text: "Éditeur, hébergeur, contacts officiels et propriété intellectuelle.",
  },
  {
    href: "/droits",
    title: "Vos droits",
    text: "Accès, rectification, effacement, applications connectées et réclamations.",
  },
  {
    href: "/support",
    title: "Support",
    text: "Aide compte, recherche, développeurs, abus et sécurité.",
  },
  {
    href: "/developers/policy",
    title: "Politique développeurs",
    text: "Règles pour les applications utilisant Se connecter avec Ayeba.",
  },
  {
    href: "/status",
    title: "Statut du service",
    text: "Disponibilité et informations d’incident.",
  },
] as const;

export default function LegalHubPage() {
  return (
    <>
      <GradientStage />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pb-16 pt-8 sm:px-6">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="opacity-90 transition hover:opacity-100" aria-label="Accueil Ayeba">
            <AyebaWordmark size="sm" />
          </Link>
          <Link href="/" className="ayeba-ghost px-3 py-2 text-xs">
            Accueil
          </Link>
        </header>

        <main className="flex-1">
          <p className="ayeba-kicker ayeba-kicker-accent">AYEBA</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            Informations légales & assistance
          </h1>
          <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-[var(--muted)]">
            Documents officiels du service Ayeba : protection des données, conditions
            d’utilisation, mentions réglementaires, droits des personnes et canaux de support.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="ayeba-panel block p-5 transition hover:border-[var(--line-bright)]"
              >
                <h2 className="text-lg font-semibold text-[var(--ink)]">{l.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{l.text}</p>
              </Link>
            ))}
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
