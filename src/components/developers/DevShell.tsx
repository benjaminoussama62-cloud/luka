"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DeveloperProject } from "@/lib/developers/console";

/* ------------------------------------------------------------------ */
/* Contexte projet — sélection persistée (localStorage + ?project=)     */
/* ------------------------------------------------------------------ */

type ProjectCtx = {
  projects: DeveloperProject[];
  memberProjects: (DeveloperProject & { memberRole: string })[];
  current: DeveloperProject | null;
  currentRole: "owner" | "editor" | "viewer" | null;
  selectProject: (id: string) => void;
  reload: () => void;
  loading: boolean;
  loginRequired: boolean;
};

const Ctx = createContext<ProjectCtx>({
  projects: [],
  memberProjects: [],
  current: null,
  currentRole: null,
  selectProject: () => {},
  reload: () => {},
  loading: true,
  loginRequired: false,
});

export const useProject = () => useContext(Ctx);

type OverviewPayload = {
  projects: DeveloperProject[];
  memberProjects?: (DeveloperProject & { memberRole: string })[];
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<DeveloperProject[]>([]);
  const [memberProjects, setMemberProjects] = useState<
    (DeveloperProject & { memberRole: string })[]
  >([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const load = useCallback(async () => {
    const res = await fetch("/api/developers/projects?all=1");
    if (res.status === 401) {
      setLoginRequired(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as OverviewPayload;
    setProjects(data.projects || []);
    setMemberProjects(data.memberProjects || []);
    const urlId = searchParams.get("project");
    const stored =
      typeof window !== "undefined" ? localStorage.getItem("ayeba.dev.project") : null;
    const all = [...(data.projects || []), ...(data.memberProjects || [])];
    const pick =
      all.find((p) => p.id === urlId)?.id ||
      all.find((p) => p.id === stored)?.id ||
      all[0]?.id ||
      null;
    setCurrentId(pick);
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const all = useMemo(() => [...projects, ...memberProjects], [projects, memberProjects]);
  const current = all.find((p) => p.id === currentId) ?? null;
  const memberEntry = memberProjects.find((p) => p.id === currentId);
  const currentRole: ProjectCtx["currentRole"] = current
    ? memberEntry
      ? (memberEntry.memberRole as "editor" | "viewer")
      : "owner"
    : null;

  const selectProject = useCallback(
    (id: string) => {
      setCurrentId(id);
      if (typeof window !== "undefined") localStorage.setItem("ayeba.dev.project", id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <Ctx.Provider
      value={{
        projects,
        memberProjects,
        current,
        currentRole,
        selectProject,
        reload: load,
        loading,
        loginRequired,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation latérale groupée (façon Google Cloud Console)             */
/* ------------------------------------------------------------------ */

const NAV_GROUPS: {
  title: string;
  items: { href: string; label: string; icon: string }[];
}[] = [
  {
    title: "Pilotage",
    items: [{ href: "/developers/console", label: "Tableau de bord", icon: "◧" }],
  },
  {
    title: "APIs et services",
    items: [
      { href: "/developers/console/apis", label: "Bibliothèque", icon: "▦" },
      { href: "/developers/console/utilisation", label: "Utilisation", icon: "◔" },
    ],
  },
  {
    title: "Identifiants",
    items: [
      { href: "/developers/console/cles", label: "Clés API", icon: "⚿" },
      { href: "/developers/console/oauth", label: "OAuth & consentement", icon: "◈" },
    ],
  },
  {
    title: "Supervision",
    items: [
      { href: "/developers/console/journaux", label: "Journaux", icon: "☰" },
    ],
  },
  {
    title: "Projet",
    items: [
      { href: "/developers/console/membres", label: "Membres", icon: "◉" },
      { href: "/developers/console/parametres", label: "Paramètres", icon: "⚙" },
    ],
  },
];

function ProjectPicker() {
  const { projects, memberProjects, current, selectProject } = useProject();
  const all = [...projects, ...memberProjects];
  if (all.length === 0) {
    return <span className="dcw-picker-empty">Aucun projet</span>;
  }
  return (
    <select
      className="dcw-picker"
      value={current?.id || ""}
      onChange={(e) => selectProject(e.target.value)}
      aria-label="Projet actif"
    >
      {projects.length > 0 && (
        <optgroup label="Mes projets">
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      )}
      {memberProjects.length > 0 && (
        <optgroup label="Partagés avec moi">
          {memberProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.memberRole === "editor" ? "éditeur" : "lecteur"})
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export function DevShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loginRequired, loading } = useProject();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="dcw">
      {/* Barre supérieure */}
      <div className="dcw-topbar">
        <button
          type="button"
          className="dcw-burger"
          aria-label="Menu"
          onClick={() => setNavOpen((v) => !v)}
        >
          ☰
        </button>
        <span className="dcw-topbar-title">Console</span>
        <ProjectPicker />
        <Link href="/developers/docs" className="dcw-topbar-link">
          Documentation
        </Link>
      </div>

      <div className="dcw-body">
        {/* Sidebar — scroll indépendant */}
        <aside className={`dcw-sidebar ${navOpen ? "open" : ""}`}>
          <nav aria-label="Console développeur">
            {NAV_GROUPS.map((g) => (
              <div key={g.title} className="dcw-nav-group">
                <p className="dcw-nav-title">{g.title}</p>
                {g.items.map((item) => {
                  const on =
                    item.href === "/developers/console"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`dcw-nav-item ${on ? "active" : ""}`}
                      onClick={() => setNavOpen(false)}
                    >
                      <span className="dcw-nav-icon" aria-hidden>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* Contenu */}
        <div className="dcw-content">
          {loginRequired ? (
            <div className="dcw-login ayeba-panel">
              <h2>Connexion requise</h2>
              <p className="dev-console-muted">
                Connectez-vous avec votre compte Ayeba pour accéder à la console développeur.
              </p>
              <Link href="/?auth=login" className="ayeba-cta inline-block px-5 py-2.5 text-sm">
                Se connecter
              </Link>
            </div>
          ) : loading ? (
            <p className="dev-console-muted">Chargement de la console…</p>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/** Point d'entrée des pages console — provider + shell + Suspense. */
export function DevConsole({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={<p className="dev-console-muted p-6">Chargement de la console…</p>}
    >
      <ProjectProvider>
        <DevShell>{children}</DevShell>
      </ProjectProvider>
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Petits composants partagés                                           */
/* ------------------------------------------------------------------ */

export function Chip({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "gray"; children: React.ReactNode }) {
  return <span className={`dcw-chip dcw-chip-${tone}`}>{children}</span>;
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="dcw-empty">
      <p className="dcw-empty-title">{title}</p>
      <p className="dcw-empty-hint">{hint}</p>
      {action}
    </div>
  );
}

/** Barres SVG — trafic quotidien appels/erreurs. */
export function DailyChart({
  data,
}: {
  data: { day: string; calls: number; errors: number }[];
}) {
  if (!data.length) return null;
  const W = 720;
  const H = 160;
  const pad = 8;
  const max = Math.max(1, ...data.map((d) => d.calls));
  const bw = Math.max(2, (W - pad * 2) / data.length - 3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dcw-chart" role="img" aria-label="Trafic quotidien">
      {data.map((d, i) => {
        const x = pad + i * ((W - pad * 2) / data.length);
        const h = (d.calls / max) * (H - 24);
        const eh = d.errors ? Math.max(2, (d.errors / max) * (H - 24)) : 0;
        return (
          <g key={d.day}>
            <rect x={x} y={H - 8 - h} width={bw} height={Math.max(2, h)} rx={1.5} className="dcw-bar" />
            {eh > 0 && (
              <rect x={x} y={H - 8 - eh} width={bw} height={eh} rx={1.5} className="dcw-bar-err" />
            )}
            <title>{`${d.day} — ${d.calls} appels, ${d.errors} erreurs`}</title>
          </g>
        );
      })}
      <line x1={pad} y1={H - 8} x2={W - pad} y2={H - 8} className="dcw-chart-axis" />
    </svg>
  );
}

/** Jauge quota — consommation du jour / quota. */
export function QuotaGauge({ used, quota }: { used: number; quota: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, quota)) * 100));
  const tone = pct >= 90 ? "red" : pct >= 70 ? "amber" : "green";
  return (
    <div className="dcw-quota">
      <div className="dcw-quota-track">
        <div className={`dcw-quota-fill dcw-quota-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="dcw-quota-label">
        {used.toLocaleString("fr")} / {quota.toLocaleString("fr")} ({pct}%)
      </span>
    </div>
  );
}
