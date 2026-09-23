import type { Metadata } from "next";
import { DevelopersShell } from "@/components/developers/DevelopersShell";
import { DevConsole } from "@/components/developers/DevShell";
import { DevMembersClient } from "@/components/developers/DevMembersClient";

export const metadata: Metadata = {
  title: "Membres — Ayeba Developers",
  robots: { index: false, follow: false },
};

export default function DeveloperMembersPage() {
  return (
    <DevelopersShell activePath="/developers/console" kicker="Console" title="Membres du projet" wide>
      <DevConsole>
        <DevMembersClient />
      </DevConsole>
    </DevelopersShell>
  );
}
