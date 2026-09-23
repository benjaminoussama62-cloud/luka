import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevOverviewClient } from "@/components/developers/DevOverviewClient";

export const metadata: Metadata = {
  title: "Console — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperConsolePage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Tableau de bord" wide>
      <DevConsole>
        <DevOverviewClient />
      </DevConsole>
    </DevelopersShell>
  );
}
