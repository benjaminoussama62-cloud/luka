import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DeveloperConsoleClient } from "@/components/developers/DeveloperConsoleClient";

export const metadata: Metadata = {
  title: "Console OAuth — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperConsolePage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Applications OAuth" wide>
      <DeveloperConsoleClient />
    </DevelopersShell>
  );
}
