"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";

export function AyebiWikiBar() {
  const { user, setLoginOpen } = useAuth();

  return (
    <div className="ayeba-wiki-bar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="opacity-80 hover:opacity-100" aria-label="AYEBA">
            <AyebaWordmark size="sm" />
          </Link>
          <span className="hidden text-[var(--faint)] sm:inline">·</span>
          <Link href="/ayebi" className="ayeba-wiki-bar-link font-medium text-white">
            Ayebi
          </Link>
          <Link href="/ayebi/recent" className="ayeba-wiki-bar-link">
            Modifications récentes
          </Link>
          <Link href="/ayebi/legal" className="ayeba-wiki-bar-link">
            Licence
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/ayebi/nouveau" className="ayeba-pill px-4 py-2 text-xs">
            + Créer une fiche
          </Link>
          {user ? (
            <>
              <Link href="/ayebi/contribuer" className="ayeba-ghost px-3 py-1.5 text-xs">
                {user.name}
              </Link>
              <Link href="/ayebi/connexion" className="ayeba-ghost px-3 py-1.5 text-xs">
                Compte
              </Link>
            </>
          ) : (
            <>
              <Link href="/ayebi/connexion" className="ayeba-ghost px-3 py-1.5 text-xs">
                Se connecter
              </Link>
              <button type="button" onClick={() => setLoginOpen(true)} className="ayeba-ghost px-3 py-1.5 text-xs">
                Connexion rapide
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
