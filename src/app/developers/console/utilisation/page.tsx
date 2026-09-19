import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsoleNav } from "@/components/developers/DevConsoleNav";
import { DevUsageClient } from "@/components/developers/DevUsageClient";

export const metadata: Metadata = {
  title: "Utilisation — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperUsagePage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Utilisation de l'API" wide>
      <DevConsoleNav active="/developers/console/utilisation" />
      <DevUsageClient />
    </DevelopersShell>
  );
}
