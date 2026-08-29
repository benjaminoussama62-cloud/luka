import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { ConnectedAppsClient } from "@/components/account/ConnectedAppsClient";

export const metadata: Metadata = {
  title: "Applications connectées — Compte Ayeba",
  robots: { index: false },
};

export default function ConnectedAppsPage() {
  return (
    <AccountShell activePath="/compte/applications" title="Applications connectées">
      <p className="mb-4 text-sm text-[var(--muted)]">
        Comme Google « Applications tierces ayant accès à votre compte » — vous contrôlez qui utilise
        votre identité Ayeba.
      </p>
      <ConnectedAppsClient />
    </AccountShell>
  );
}
