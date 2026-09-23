import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevApisClient } from "@/components/developers/DevApisClient";

export const metadata: Metadata = {
  title: "Bibliothèque d'APIs — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperApisPage() {
  return (
    <DevelopersShell
      activePath="/developers/console"
      kicker="Console"
      title="Bibliothèque d'APIs"
      wide
    >
      <DevConsole>
        <DevApisClient />
      </DevConsole>
    </DevelopersShell>
  );
}
