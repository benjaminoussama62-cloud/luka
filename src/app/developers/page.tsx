import type { Metadata } from "next";
import Link from "next/link";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { oauthEndpoint } from "@/lib/oauth-provider/endpoints";

export const metadata: Metadata = {
  title: "Ayeba Developers — OAuth & identité",
  description:
    "Connectez vos applications à Ayeba : OAuth 2.0 / OpenID Connect, même schéma que Google Sign-In.",
  openGraph: {
    title: "Ayeba Developers",
    url: "https://ayeba.app/developers",
  },
};

const STEPS = [
  {
    title: "Console",
    text: "Créez une app OAuth, récupérez client_id et client_secret, enregistrez vos redirect URIs HTTPS.",
    href: "/developers/console",
  },
  {
    title: "Authorize",
    text: "Redirigez vers /oauth/authorize avec client_id, redirect_uri, scope openid email profile, state.",
    href: "/developers/docs#flow",
  },
  {
    title: "Token",
    text: "Échangez le code contre access_token, refresh_token et id_token via POST /oauth/token.",
    href: "/developers/docs#endpoints",
  },
  {
    title: "Userinfo",
    text: "Lisez sub (ID Ayeba stable), email et profil via Bearer access_token.",
    href: "/developers/docs#claims",
  },
];

export default function DevelopersLandingPage() {
  return (
    <DevelopersShell activePath="/developers">
      <p className="ayeba-kicker ayeba-kicker-accent -mt-2">Ayeba Developers</p>
      <h1 className="max-w-3xl font-[family-name:var(--font-brand)] text-[clamp(2.4rem,8vw,4.2rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-[var(--ink)]">
        Se connecter avec Ayeba — pour toutes vos apps sœurs.
      </h1>
      <p className="mt-5 max-w-2xl text-[1.08rem] leading-relaxed text-[var(--muted)]">
        Ayeba est le fournisseur d’identité (comme accounts.google.com). Omega et les futures
        applications utilisent le même compte, le même identifiant stable{" "}
        <code className="text-[var(--ink)]">sub</code>, et les standards OAuth 2.0 / OpenID Connect.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Link key={s.title} href={s.href} className="ayeba-panel dev-overview-card p-5 transition hover:border-[var(--line-bright)]">
            <h2 className="text-lg font-semibold text-[var(--ink)]">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.text}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 ayeba-panel p-6">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Omega — configuration production</h2>
        <dl className="dev-console-endpoints mt-4">
          <div>
            <dt>client_id</dt>
            <dd>
              <code>ayeba_omega_web_prod</code>
            </dd>
          </div>
          <div>
            <dt>redirect_uri</dt>
            <dd>
              <code>https://omega-web.org/api/ayeba/callback</code>
            </dd>
          </div>
          <div>
            <dt>authorize</dt>
            <dd>
              <code>{oauthEndpoint("authorize")}</code>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/developers/console" className="ayeba-cta px-6 py-3 text-sm">
          Ouvrir la console
        </Link>
        <Link href="/developers/docs" className="ayeba-ghost px-6 py-3 text-sm">
          Documentation complète
        </Link>
      </div>
    </DevelopersShell>
  );
}
