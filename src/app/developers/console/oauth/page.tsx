import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsoleNav } from "@/components/developers/DevConsoleNav";
import { DeveloperConsoleClient } from "@/components/developers/DeveloperConsoleClient";

export const metadata: Metadata = {
  title: "Identifiants OAuth — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperOAuthPage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Clients OAuth 2.0 / OpenID Connect" wide>
      <DevConsoleNav active="/developers/console/oauth" />
      <DeveloperConsoleClient />
    </DevelopersShell>
  );
}
