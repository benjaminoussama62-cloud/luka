import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevLogsClient } from "@/components/developers/DevLogsClient";

export const metadata: Metadata = {
  title: "Journaux — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperLogsPage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Journaux de requêtes" wide>
      <DevConsole>
        <DevLogsClient />
      </DevConsole>
    </DevelopersShell>
  );
}
