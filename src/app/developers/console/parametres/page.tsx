import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevSettingsClient } from "@/components/developers/DevSettingsClient";

export const metadata: Metadata = {
  title: "Paramètres — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperSettingsPage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Paramètres du projet" wide>
      <DevConsole>
        <DevSettingsClient />
      </DevConsole>
    </DevelopersShell>
  );
}
