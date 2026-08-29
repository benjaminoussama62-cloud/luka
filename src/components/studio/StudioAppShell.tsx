"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { useAuth } from "@/lib/auth";

const MODULES = [
  { id: "radar", label: "Radar", live: true },
  { id: "trace", label: "Trace", live: true },
  { id: "yield", label: "Yield", live: true },
  { id: "velocity", label: "Velocity", live: true },
  { id: "aether", label: "Aether", live: true },
] as const;

export function StudioAppShell({
  children,
  siteId,
  siteDomain,
}: {
  children: React.ReactNode;
  siteId?: string;
  siteDomain?: string;
}) {
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="studio-shell relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-5">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/studio" aria-label="Ayeba Studio">
            <AyebaWordmark size="sm" />
          </Link>
          <div className="hidden h-6 w-px bg-[var(--line)] sm:block" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">Studio</p>
            <p className="truncate font-[family-name:var(--font-brand)] text-lg text-[var(--ink)]">
              {siteDomain || "Vos sites"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/studio/app" className="ayeba-ghost px-3 py-2 text-xs">
            Sites
          </Link>
          {ready && user ? (
            <button type="button" className="ayeba-ghost px-3 py-2 text-xs" onClick={() => void logout()}>
              {user.name.split(" ")[0]}
            </button>
          ) : (
            <Link href="/ayebi/connexion?redirect=/studio/app" className="ayeba-cta px-3 py-2 text-xs">
              Connexion
            </Link>
          )}
        </div>
      </header>

      {siteId ? (
        <nav className="studio-nav mt-5 flex flex-wrap gap-1 border-b border-[var(--line)] pb-3" aria-label="Modules">
          {MODULES.map((m) => {
            const href = `/studio/app/${siteId}/${m.id}`;
            const active = pathname?.includes(`/${m.id}`);
            return (
              <Link
                key={m.id}
                href={href}
                className={`px-3 py-2 text-xs transition ${
                  active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
                style={
                  active
                    ? { boxShadow: "inset 0 -2px 0 var(--accent)" }
                    : undefined
                }
              >
                {m.label}
              </Link>
            );
          })}
          <Link
            href={`/studio/app/${siteId}/verify`}
            className={`ml-auto px-3 py-2 text-xs ${
              pathname?.includes("/verify") ? "text-[var(--ink)]" : "text-[var(--muted)]"
            }`}
          >
            Propriété
          </Link>
        </nav>
      ) : null}

      <div className="mt-8 flex-1">{children}</div>
    </div>
  );
}
