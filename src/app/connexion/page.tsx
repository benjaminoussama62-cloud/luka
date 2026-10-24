import type { Metadata } from "next";
import { Suspense } from "react";
import { ConnexionClient } from "@/components/auth/ConnexionClient";

export const metadata: Metadata = {
  title: "Connexion — Compte Ayeba",
  robots: { index: false },
};

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Suspense fallback={null}>
      <ConnexionClient next={typeof next === "string" ? next : "/"} />
    </Suspense>
  );
}
