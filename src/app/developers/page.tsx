import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";

export const metadata: Metadata = {
  title: "Ayeba Developers — Identité & intégration",
  description:
    "Intégrez Se connecter avec Ayeba : identité unique pour vos applications, standards OAuth 2.0 et OpenID Connect.",
  openGraph: {
    title: "Ayeba Developers",
    url: "https://ayeba.app/developers",
  },
};

const PILLARS = [
  {
    title: "Une identité pour l’écosystème",
    text: "Un même compte Ayeba permet d’ouvrir les applications sœurs et les services partenaires, avec un identifiant stable partagé uniquement après consentement explicite de l’utilisateur.",
  },
  {
    title: "Standards ouverts",
    text: "L’intégration s’appuie sur OAuth 2.0 et OpenID Connect. Les endpoints publics sont découverts via le document OpenID Configuration — sans dépendance à une bibliothèque propriétaire.",
  },
  {
    title: "Contrôle utilisateur",
    text: "Chaque autorisation passe par un écran de consentement. L’utilisateur peut révoquer l’accès d’une application depuis son compte Ayeba à tout moment.",
  },
  {
    title: "Vérification des applications",
    text: "Les applications tierces destinées à la production font l’objet d’une revue (finalité, redirect URIs, site web, usage des scopes) avant d’être pleinement activées.",
  },
] as const;

export default function DevelopersLandingPage() {
  return (
    <DevelopersShell activePath="/developers">
      <p className="ayeba-kicker ayeba-kicker-accent -mt-2">Ayeba Developers</p>
      <h1 className="max-w-3xl font-[family-name:var(--font-brand)] text-[clamp(2.4rem,8vw,4.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[var(--ink)]">
        Se connecter avec Ayeba.
      </h1>
      <p className="mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-[var(--muted)]">
        Ayeba opère un fournisseur d’identité pour ses applications sœurs et pour les éditeurs
        qui souhaitent proposer une connexion sécurisée à leurs utilisateurs. L’objectif est
        simple : un compte humain, des permissions claires, des intégrations durables.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => (
          <article key={p.title} className="ayeba-panel p-5">
            <h2 className="text-lg font-semibold text-[var(--ink)]">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-10 ayeba-panel p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Pour commencer</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--muted)]">
          <li>
            Créez ou ouvrez une application dans la{" "}
            <Link href="/developers/console" className="text-[var(--ink)] underline">
              console OAuth
            </Link>
            . Les identifiants et redirect URIs sont délivrés dans cet espace authentifié — pas
            sur les pages publiques.
          </li>
          <li>
            Consultez la{" "}
            <Link href="/developers/docs" className="text-[var(--ink)] underline">
              documentation d’intégration
            </Link>{" "}
            et le document de découverte OpenID pour brancher votre serveur correctement.
          </li>
          <li>
            Respectez la{" "}
            <Link href="/developers/policy" className="text-[var(--ink)] underline">
              politique développeurs
            </Link>{" "}
            : finalité claire, secrets côté serveur, consentement utilisateur.
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/developers/console" className="ayeba-cta px-6 py-3 text-sm">
          Ouvrir la console
        </Link>
        <Link href="/developers/docs" className="ayeba-ghost px-6 py-3 text-sm">
          Documentation
        </Link>
        <Link href="/developers/policy" className="ayeba-ghost px-6 py-3 text-sm">
          Politique
        </Link>
      </div>
    </DevelopersShell>
  );
}
