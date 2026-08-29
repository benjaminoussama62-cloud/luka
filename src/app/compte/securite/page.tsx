import type { Metadata } from "next";
import { AccountShell } from "@/components/account/AccountShell";
import { SecurityClient } from "@/components/account/SecurityClient";

export const metadata: Metadata = {
  title: "Sécurité — Compte Ayeba",
  robots: { index: false },
};

export default function SecurityPage() {
  return (
    <AccountShell activePath="/compte/securite" title="Sécurité du compte">
      <SecurityClient />
    </AccountShell>
  );
}
