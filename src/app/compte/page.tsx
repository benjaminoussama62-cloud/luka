import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import { getSessionFromCookies } from "@/lib/auth-server";
import { SISTER_APPS } from "@/lib/oauth-provider/sister-apps";

export const metadata: Metadata = {
  title: "Compte Ayeba",
  robots: { index: false },
};

export default async function AccountPage() {
  const session = await getSessionFromCookies();

  return (
    <AccountShell activePath="/compte" title="Votre compte">
      {!session ? (
        <div className="ayeba-panel p-6">
          <p>Connectez-vous pour gérer votre compte Ayeba, vos applications connectées et la sécurité.</p>
          <Link href="/?auth=login" className="ayeba-cta mt-4 inline-block px-5 py-2 text-sm">
            Se connecter
          </Link>
        </div>
      ) : (
        <>
          <div className="ayeba-panel p-6 mb-4">
            <p className="text-lg font-semibold text-[var(--ink)]">{session.name}</p>
            <p className="text-sm text-[var(--muted)]">{session.email}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/compte/applications" className="ayeba-panel dev-overview-card p-5">
              <h2 className="font-semibold text-[var(--ink)]">Applications connectées</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Omega, JEMSA, TALA, Sombateka et apps tierces — révoquez l&apos;accès à tout moment.
              </p>
            </Link>
            <Link href="/compte/securite" className="ayeba-panel dev-overview-card p-5">
              <h2 className="font-semibold text-[var(--ink)]">Sécurité</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">2FA, codes de secours, protection du compte.</p>
            </Link>
          </div>
          <div className="ayeba-panel p-6 mt-4">
            <h2 className="font-semibold text-[var(--ink)]">Écosystème Ayeba</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              {SISTER_APPS.map((a) => (
                <li key={a.slug}>
                  <strong className="text-[var(--ink)]">{a.name}</strong> —{" "}
                  <code className="text-xs">{a.clientId}</code>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </AccountShell>
  );
}
