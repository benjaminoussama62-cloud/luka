"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AyebaWordmark } from "@/components/brand/AyebaIcon";
import { useAuth } from "@/lib/auth";
import type { StudioSite } from "@/lib/studio/types";

/** Arborescence complète de la console — sous-sections visibles au module actif. */
const MODULE_NAV: {
  id: string;
  label: string;
  sub: { slug: string; label: string }[];
}[] = [
  {
    id: "aether",
    label: "Aether",
    sub: [
      { slug: "", label: "Vue d'ensemble" },
      { slug: "tendances", label: "Tendances" },
      { slug: "produits", label: "Produits" },
    ],
  },
  {
    id: "radar",
    label: "Radar",
    sub: [
      { slug: "", label: "Vue d'ensemble" },
      { slug: "performance", label: "Performance" },
      { slug: "inspection", label: "Inspection d'URL" },
      { slug: "couverture", label: "Couverture" },
      { slug: "sitemaps", label: "Sitemaps" },
      { slug: "liens", label: "Liens" },
    ],
  },
  {
    id: "trace",
    label: "Trace",
    sub: [
      { slug: "", label: "Vue d'ensemble" },
      { slug: "audience", label: "Audience" },
      { slug: "acquisition", label: "Acquisition" },
      { slug: "comportement", label: "Comportement" },
      { slug: "conversions", label: "Conversions" },
      { slug: "attribution", label: "Attribution" },
      { slug: "cohortes", label: "Cohortes" },
      { slug: "tags", label: "Balises" },
    ],
  },
  { id: "velocity", label: "Velocity", sub: [{ slug: "", label: "Audits" }] },
  {
    id: "yield",
    label: "Yield",
    sub: [
      { slug: "", label: "Monétisation" },
      { slug: "campagnes", label: "Campagnes" },
      { slug: "annonces", label: "Annonces" },
      { slug: "mots-cles", label: "Mots-clés" },
      { slug: "audiences", label: "Audiences" },
      { slug: "facturation", label: "Facturation" },
    ],
  },
];

function SitePicker({ siteId, siteDomain }: { siteId?: string; siteDomain?: string }) {
  const [sites, setSites] = useState<StudioSite[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/studio/sites");
      if (res.ok) setSites(((await res.json()) as { sites: StudioSite[] }).sites || []);
    })();
  }, []);

  if (!siteId) return null;
  if (sites.length <= 1) {
    return <span className="st-site-name">{siteDomain || "Site"}</span>;
  }
  return (
    <select
      className="st-picker"
      value={siteId}
      aria-label="Site actif"
      onChange={(e) => {
        // Même module, autre site
        const next = e.target.value;
        const rest = pathname?.split(`/studio/app/${siteId}`)[1] || "";
        router.push(`/studio/app/${next}${rest}`);
      }}
    >
      {sites.map((s) => (
        <option key={s.id} value={s.id}>
          {s.domain}
        </option>
      ))}
    </select>
  );
}

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
  const [navOpen, setNavOpen] = useState(false);

  const activeModule = MODULE_NAV.find((m) => pathname?.includes(`/${m.id}`));
  const base = siteId ? `/studio/app/${siteId}` : "/studio/app";

  return (
    <div className="st-shell">
      {/* Barre supérieure */}
      <header className="st-topbar">
        <button
          type="button"
          className="st-burger"
          aria-label="Menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          ☰
        </button>
        <Link href="/studio" aria-label="Ayeba Studio" className="st-brand">
          <AyebaWordmark size="sm" />
          <span className="st-brand-sep" />
          <span className="st-brand-sub">Studio</span>
        </Link>
        <SitePicker siteId={siteId} siteDomain={siteDomain} />
        <div className="st-topbar-right">
          <Link href="/studio/app" className="st-topbar-link">
            Sites
          </Link>
          {ready && user ? (
            <button
              type="button"
              className="st-topbar-link"
              onClick={() => void logout()}
            >
              {(user.name?.trim() || user.email.split("@")[0]).split(" ")[0]} · quitter
            </button>
          ) : (
            <Link href="/ayebi/connexion?redirect=/studio/app" className="ayeba-cta px-3 py-2 text-xs">
              Connexion
            </Link>
          )}
        </div>
      </header>

      <div className="st-body">
        {siteId ? (
          <aside className={`st-sidebar ${navOpen ? "open" : ""}`}>
            <nav aria-label="Console Studio">
              <Link
                href={base}
                className={`st-nav-item ${pathname === base ? "active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                Vue d&rsquo;ensemble
              </Link>
              {MODULE_NAV.map((m) => {
                const modActive = activeModule?.id === m.id;
                return (
                  <div key={m.id} className="st-nav-group">
                    <Link
                      href={`${base}/${m.id}`}
                      className={`st-nav-item ${modActive ? "active" : ""}`}
                      onClick={() => setNavOpen(false)}
                    >
                      {m.label}
                    </Link>
                    {modActive &&
                      m.sub.map((s) => {
                        const href = s.slug ? `${base}/${m.id}/${s.slug}` : `${base}/${m.id}`;
                        const on = s.slug ? pathname === href : pathname === `${base}/${m.id}`;
                        return (
                          <Link
                            key={s.slug || "index"}
                            href={href}
                            className={`st-nav-sub ${on ? "active" : ""}`}
                            onClick={() => setNavOpen(false)}
                          >
                            {s.label}
                          </Link>
                        );
                      })}
                  </div>
                );
              })}
              <Link
                href={`${base}/verify`}
                className={`st-nav-item ${pathname?.includes("/verify") ? "active" : ""}`}
                onClick={() => setNavOpen(false)}
              >
                Propriété
              </Link>
            </nav>
          </aside>
        ) : null}

        <main className="st-content">{children}</main>
      </div>
    </div>
  );
}
