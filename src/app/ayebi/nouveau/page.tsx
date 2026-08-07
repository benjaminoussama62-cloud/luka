"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AyebiEditor } from "@/components/ayebi/AyebiEditor";
import { AyebiStage } from "@/components/ayebi/AyebiStage";

export default function NouvelleFichePage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/ayebi/connexion?redirect=/ayebi/nouveau");
  }, [ready, user, router]);

  if (!ready) return null;
  if (!user) return null;

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mb-8">
          <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">
            ← Ayebi
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white">Créer une fiche</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Rédigez une nouvelle page encyclopédique sur la RDC. Soyez factuel, structuré, 100&nbsp;% congolais.
          </p>
        </div>
        <AyebiEditor mode="create" />
      </div>
    </>
  );
}
