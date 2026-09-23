import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevKeysClient } from "@/components/developers/DevKeysClient";

export const metadata: Metadata = {
  title: "Clés API — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperKeysPage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Clés API" wide>
      <DevConsole>
        <DevKeysClient />
      </DevConsole>
    </DevelopersShell>
  );
}
