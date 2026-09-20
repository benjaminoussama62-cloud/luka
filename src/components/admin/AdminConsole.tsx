"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- types ---------- */

type Row = Record<string, unknown>;

type Dashboard = {
  overview: {
    network: { global: Record<string, number | string> };
    financial: Row;
    compliance: Row;
    system: { health: string; uptime: number; activeUsers: number };
  };
  alerts: Row[];
  tasks: Row[];
  support: { openTickets: number; urgentTickets: number; myTickets: number; avgResponseTime: number };
  moderation: { pendingItems: number; urgentItems: number; myItems: number; approvedToday: number };
  recentActivity: Row[];
};

type Tab =
  | "overview"
  | "users"
  | "moderation"
  | "support"
  | "billing"
  | "network"
  | "content"
  | "search"
  | "ecosystem"
  | "security"
  | "system"
  | "audit"
  | "team"
  | "chat"
  | "broadcast"
  | "incidents";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "moderation", label: "Modération" },
  { id: "support", label: "Support" },
  { id: "billing", label: "Facturation" },
  { id: "network", label: "Réseau pubs" },
  { id: "content", label: "Contenu & accès" },
  { id: "search", label: "Recherche & Index" },
  { id: "ecosystem", label: "Écosystème" },
  { id: "security", label: "Sécurité" },
  { id: "broadcast", label: "Annonces" },
  { id: "incidents", label: "Incidents" },
  { id: "system", label: "Système" },
  { id: "audit", label: "Journal & alertes" },
  { id: "team", label: "Équipe admin" },
  { id: "chat", label: "Chat équipe" },
];

/* ---------- helpers ---------- */

const s = (v: unknown, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : String(v);
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const money = (v: unknown, currency = "CDF") =>
  `${num(v).toLocaleString("fr-CD")} ${currency}`;
const dt = (v: unknown) => {
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

async function api<T = Row>(path: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(path, init);
  if (!res.ok) return null;
  return (await res.json()) as T;
}

function post(path: string, body: Row) {
  return api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patch(path: string, body: Row) {
  return api(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/* ---------- small ui ---------- */

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "dim"; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    ok: "#22c55e",
    warn: "#eab308",
    bad: "#ef4444",
    info: "#38bdf8",
    dim: "#9ca3af",
  };
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: colors[tone], border: `1px solid ${colors[tone]}55`, background: `${colors[tone]}14` }}
    >
      {children}
    </span>
  );
}

function statusTone(v: unknown): "ok" | "warn" | "bad" | "info" | "dim" {
  const x = String(v ?? "");
  if (["active", "approved", "paid", "resolved", "healthy", "open", "processed", "verified"].includes(x)) return "ok";
  if (["pending", "in_progress", "under_review", "waiting_customer", "processing"].includes(x)) return "warn";
  if (["rejected", "failed", "suspended", "critical", "urgent", "overdue"].includes(x)) return "bad";
  if (["closed", "cancelled", "expired"].includes(x)) return "dim";
  return "info";
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="ayeba-panel p-4">
      <p className="ayeba-kicker">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-60">{hint}</p> : null}
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm opacity-50">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider opacity-60" style={{ borderColor: "var(--line)" }}>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b" style={{ borderColor: "var(--line)" }}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Btn({ children, onClick, danger, disabled }: { children: React.ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-40"
      style={{
        border: `1px solid ${danger ? "#ef4444" : "var(--line-bright)"}`,
        color: danger ? "#ef4444" : "var(--ink)",
        background: danger ? "#ef444412" : "rgba(232,93,4,0.10)",
      }}
    >
      {children}
    </button>
  );
}

/* ---------- main ---------- */

export function AdminConsole({
  adminName,
  adminEmail,
  adminRole,
  sections,
}: {
  adminName: string;
  adminEmail: string;
  adminRole: string;
  sections: string[];
}) {
  const visibleTabs = TABS.filter((t) => sections.includes(t.id));
  const [tab, setTab] = useState<Tab>((visibleTabs[0]?.id ?? "overview") as Tab);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [data, setData] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // support detail state
  const [ticket, setTicket] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userDossier, setUserDossier] = useState<Row | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("support");
  const [newAdminPassword, setNewAdminPassword] = useState<string | null>(null);

  // broadcast + incidents forms
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annSeverity, setAnnSeverity] = useState("info");
  const [incTitle, setIncTitle] = useState("");
  const [incSeverity, setIncSeverity] = useState("minor");
  const [incServices, setIncServices] = useState<string[]>([]);
  const [incUpdateMsg, setIncUpdateMsg] = useState<Record<string, string>>({});

  // chat state
  const [chatChannel, setChatChannel] = useState("team");
  const [chatMessages, setChatMessages] = useState<Row[]>([]);
  const [chatMembers, setChatMembers] = useState<Row[]>([]);
  const [chatMe, setChatMe] = useState("");
  const [chatInput, setChatInput] = useState("");
  const chatLastTs = useRef("");

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadTab = useCallback(async (t: Tab, q?: string) => {
    setBusy(true);
    try {
      if (t === "overview") {
        const d = await api<Dashboard>("/api/admin/dashboard");
        if (d) setDash(d);
        return;
      }
      const path =
        t === "users" ? `/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}` :
        t === "moderation" ? "/api/admin/moderation" :
        t === "support" ? "/api/admin/support" :
        t === "billing" ? "/api/admin/billing" :
        t === "network" ? "/api/admin/network" :
        t === "content" ? "/api/admin/content" :
        t === "search" ? "/api/admin/search" :
        t === "ecosystem" ? "/api/admin/ecosystem" :
        t === "security" ? "/api/admin/security" :
        t === "broadcast" ? "/api/admin/announcements" :
        t === "incidents" ? "/api/admin/incidents" :
        t === "system" ? "/api/admin/system" :
        t === "team" ? "/api/admin/admins" :
        "/api/admin/audit";
      const d = await api<Row>(path);
      if (d) setData(d);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => void loadTab(tab), 0);
    return () => clearTimeout(id);
  }, [tab, loadTab]);

  // Poll chat messages while the chat tab is open (serverless-safe: no websockets).
  useEffect(() => {
    if (tab !== "chat") return;
    let alive = true;
    const channelParam = (c: string) =>
      c === "team" ? "team" : `dm:${[chatMe, c].sort().join(":")}`;
    const pull = async (after?: string) => {
      const d = await api<{
        messages: Row[]; members: Row[]; me: string;
      }>(`/api/admin/chat?channel=${encodeURIComponent(channelParam(chatChannel))}${after ? `&after=${encodeURIComponent(after)}` : ""}`);
      if (!d || !alive) return;
      setChatMe(d.me);
      setChatMembers(d.members);
      setChatMessages((prev) => (after ? [...prev, ...d.messages] : d.messages));
      const newest = d.messages[d.messages.length - 1];
      if (newest) chatLastTs.current = String(newest.created_at);
    };
    chatLastTs.current = "";
    void Promise.resolve().then(() => pull());
    const iv = setInterval(() => {
      void pull(chatLastTs.current || undefined);
    }, 4000);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, chatChannel]);

  const patchAct = async (path: string, body: Row, okMsg: string) => {
    const res = await patch(path, body);
    if (res) {
      flash(okMsg);
      await loadTab(tab, userQuery);
    } else {
      flash("Action échouée");
    }
  };

  const act = async (path: string, body: Row, okMsg: string) => {
    const res = await post(path, body);
    if (res) {
      flash(okMsg);
      await loadTab(tab, userQuery);
      if (tab === "support" && ticket) {
        const t = await api<{ ticket: Row }>(`/api/admin/support?id=${ticket.id}`);
        if (t) setTicket(t.ticket);
      }
    } else {
      flash("Action échouée");
    }
  };

  const g = dash?.overview?.network?.global ?? {};

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r p-4"
        style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.02)" }}
      >
        <div className="mb-6 px-2">
          <p className="ayeba-kicker ayeba-kicker-accent">Ayeba</p>
          <h1 className="text-lg font-semibold">Back Office</h1>
        </div>
        <nav className="flex-1 space-y-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setTicket(null); }}
              className="w-full rounded-lg px-3 py-2 text-left text-sm transition"
              style={
                tab === t.id
                  ? { background: "rgba(232,93,4,0.16)", color: "var(--ink)", borderLeft: "2px solid #e85d04" }
                  : { color: "rgba(245,245,247,0.65)" }
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="border-t pt-3 text-xs" style={{ borderColor: "var(--line)" }}>
          <p className="font-medium">{adminName}</p>
          <p className="opacity-60">{adminEmail}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge tone="info">{adminRole}</Badge>
            <button
              className="rounded-md px-2 py-1 text-[11px] transition"
              style={{ border: "1px solid #ef444466", color: "#f87171" }}
              onClick={async () => {
                await fetch("/api/admin/auth/logout", { method: "POST" });
                window.location.href = "/admin/connexion";
              }}
            >
              Verrouiller
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="min-w-0 flex-1 p-6">
        {notice ? (
          <div className="mb-4 rounded-lg px-4 py-2 text-sm" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid #22c55e55" }}>
            {notice}
          </div>
        ) : null}

        {tab === "overview" && (
          <section className="space-y-6">
            <header>
              <h2 className="text-xl font-semibold">Vue d&rsquo;ensemble</h2>
              <p className="text-sm opacity-60">État global de l&rsquo;écosystème Ayeba</p>
            </header>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Santé système" value={<Badge tone={statusTone(g.systemHealth)}>{s(g.systemHealth)}</Badge>} hint={`${num(dash?.overview?.system?.activeUsers)} utilisateurs actifs`} />
              <Stat label="Tickets ouverts" value={num(dash?.support?.openTickets)} hint={`${num(dash?.support?.urgentTickets)} urgents`} />
              <Stat label="File de modération" value={num(dash?.moderation?.pendingItems)} hint={`${num(dash?.moderation?.urgentItems)} urgents`} />
              <Stat label="Revenu réseau" value={money(g.totalRevenue)} hint={`${num(g.activeCampaigns)} campagnes actives`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Stat label="Impressions" value={num(g.totalImpressions).toLocaleString("fr-CD")} hint={`CTR ${num(g.totalImpressions) ? ((num(g.totalClicks) / num(g.totalImpressions)) * 100).toFixed(2) : "0"}%`} />
              <Stat label="Fill rate moyen" value={`${num(g.avgFillRate).toFixed(1)}%`} hint={`CPM moyen ${money(g.avgCpm)}`} />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Alertes actives</p>
              <Table
                head={["Sévérité", "Titre", "Source", "Créée"]}
                rows={(dash?.alerts ?? []).map((a) => [
                  <Badge key="s" tone={statusTone(a.severity)}>{s(a.severity)}</Badge>,
                  s(a.title), s(a.source), dt(a.created_at),
                ])}
                empty="Aucune alerte active"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Activité récente</p>
              <Table
                head={["Admin", "Action", "Entité", "Date"]}
                rows={(dash?.recentActivity ?? []).map((l) => [
                  s(l.adminName), s(l.action), `${s(l.entityType)} · ${s(l.entityId)}`, dt(l.timestamp),
                ])}
                empty="Aucune activité"
              />
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="space-y-4">
            <header className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Utilisateurs</h2>
                <p className="text-sm opacity-60">
                  {num((data.stats as Row)?.totalUsers)} comptes · {num((data.stats as Row)?.studioSites)} sites Studio · {num((data.stats as Row)?.ayebiArticles)} articles Ayebi
                </p>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); void loadTab("users", userQuery); }}
                className="flex gap-2"
              >
                <input className="ayeba-input" placeholder="Nom ou email…" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
                <Btn onClick={() => void loadTab("users", userQuery)}>Rechercher</Btn>
              </form>
            </header>
            <div className="ayeba-panel p-4">
              <Table
                head={["Nom", "Email", "Provider", "Rôle", "Statut", "Inscrit le", "Actions"]}
                rows={((data.users as Row[]) ?? []).map((u) => [
                  <button key="n" className="underline underline-offset-2" onClick={async () => {
                    const d = await api<Row>(`/api/admin/users?id=${u.id}`);
                    if (d) setUserDossier(d);
                  }}>{s(u.name)}</button>,
                  s(u.email), s(u.provider), <Badge key="r" tone={statusTone(u.role)}>{s(u.role)}</Badge>,
                  <Badge key="st" tone={statusTone(u.status)}>{s(u.status, "active")}</Badge>,
                  dt(u.created_at),
                  u.status === "suspended" ? (
                    <Btn key="a" onClick={() => void act("/api/admin/users", { action: "activate", userId: u.id }, "Compte réactivé")}>Réactiver</Btn>
                  ) : (
                    <Btn key="s" danger onClick={() => {
                      if (window.confirm(`Suspendre ${s(u.email)} ? Ses sessions seront coupées.`)) {
                        void act("/api/admin/users", { action: "suspend", userId: u.id }, "Compte suspendu");
                      }
                    }}>Suspendre</Btn>
                  ),
                ])}
                empty="Aucun utilisateur"
              />
            </div>

            {userDossier ? (
              <div className="ayeba-panel p-4">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="ayeba-kicker">Dossier utilisateur</p>
                    <h3 className="font-semibold">{s((userDossier.user as Row)?.name)} · {s((userDossier.user as Row)?.email)}</h3>
                    <p className="text-xs opacity-60">
                      {s((userDossier.user as Row)?.provider)} · 2FA {((userDossier.detail as Row)?.totpEnabled) ? "activée" : "inactive"} · {num((userDossier.detail as Row)?.searches)} recherches · {num((userDossier.detail as Row)?.revisions)} révisions Ayebi
                    </p>
                  </div>
                  <Btn onClick={() => setUserDossier(null)}>Fermer</Btn>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <p className="ayeba-kicker mb-2">Sites Studio</p>
                    <Table head={["Domaine", "Statut"]} rows={(((userDossier.detail as Row)?.sites as Row[]) ?? []).map((x) => [s(x.domain), <Badge key="s" tone={statusTone(x.status)}>{s(x.status)}</Badge>])} empty="Aucun site" />
                  </div>
                  <div>
                    <p className="ayeba-kicker mb-2">Articles Ayebi</p>
                    <Table head={["Article", "Créé"]} rows={(((userDossier.detail as Row)?.articles as Row[]) ?? []).map((x) => [s(x.title), dt(x.created_at)])} empty="Aucun article" />
                  </div>
                  <div>
                    <p className="ayeba-kicker mb-2">Tickets support</p>
                    <Table head={["Sujet", "Statut"]} rows={(((userDossier.detail as Row)?.tickets as Row[]) ?? []).map((x) => [s(x.subject), <Badge key="s" tone={statusTone(x.status)}>{s(x.status)}</Badge>])} empty="Aucun ticket" />
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {tab === "moderation" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Modération</h2>
              <p className="text-sm opacity-60">
                {num((data.stats as Row)?.pendingItems)} en attente · {num((data.stats as Row)?.urgentItems)} urgents · {num((data.stats as Row)?.approvedToday)} approuvés aujourd&rsquo;hui
              </p>
            </header>
            <div className="ayeba-panel p-4">
              <Table
                head={["Type", "Raison", "Priorité", "Statut", "Soumis", "Actions"]}
                rows={((data.items as Row[]) ?? []).map((m) => [
                  `${s(m.type)} · ${s(m.entityId)}`,
                  s(m.reason),
                  <Badge key="p" tone={statusTone(m.priority)}>{s(m.priority)}</Badge>,
                  <Badge key="st" tone={statusTone(m.status)}>{s(m.status)}</Badge>,
                  dt(m.submittedAt),
                  m.status === "pending" || m.status === "under_review" ? (
                    <span key="a" className="flex gap-1">
                      <Btn onClick={() => void act("/api/admin/moderation", { action: "approve", itemId: m.id }, "Approuvé")}>Approuver</Btn>
                      <Btn danger onClick={() => { const n = window.prompt("Motif du rejet :"); if (n) void act("/api/admin/moderation", { action: "reject", itemId: m.id, notes: n }, "Rejeté"); }}>Rejeter</Btn>
                    </span>
                  ) : s(m.reviewedBy),
                ])}
                empty="File de modération vide"
              />
            </div>
          </section>
        )}

        {tab === "support" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Support</h2>
              <p className="text-sm opacity-60">
                {num((data.stats as Row)?.openTickets)} ouverts · {num((data.stats as Row)?.urgentTickets)} urgents
              </p>
            </header>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <Table
                  head={["N°", "Sujet", "Cat.", "Priorité", "Statut"]}
                  rows={((data.tickets as Row[]) ?? []).map((t) => [
                    <button key="n" className="underline underline-offset-2" onClick={async () => { const d = await api<{ ticket: Row }>(`/api/admin/support?id=${t.id}`); if (d) setTicket(d.ticket); }}>
                      {s(t.ticketNumber)}
                    </button>,
                    s(t.subject),
                    s(t.category),
                    <Badge key="p" tone={statusTone(t.priority)}>{s(t.priority)}</Badge>,
                    <Badge key="s" tone={statusTone(t.status)}>{s(t.status)}</Badge>,
                  ])}
                  empty="Aucun ticket"
                />
              </div>
              <div className="ayeba-panel p-4">
                {ticket ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="ayeba-kicker">{s(ticket.ticketNumber)} · {s(ticket.category)}</p>
                        <h3 className="font-semibold">{s(ticket.subject)}</h3>
                        <p className="text-xs opacity-60">{s(ticket.userName)} · {s(ticket.userEmail)}</p>
                      </div>
                      <Badge tone={statusTone(ticket.status)}>{s(ticket.status)}</Badge>
                    </div>
                    <p className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,255,255,0.04)" }}>{s(ticket.description)}</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      {((ticket.messages as Row[]) ?? []).map((m) => (
                        <div key={s(m.id)} className="rounded-lg p-2 text-sm" style={{ background: m.senderType === "admin" ? "rgba(232,93,4,0.10)" : "rgba(255,255,255,0.04)" }}>
                          <p className="text-xs opacity-60">{s(m.senderName)} · {dt(m.createdAt)}</p>
                          <p>{s(m.message)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input className="ayeba-input flex-1" placeholder="Réponse au client…" value={reply} onChange={(e) => setReply(e.target.value)} />
                      <Btn onClick={() => { if (reply.trim()) { void act("/api/admin/support", { action: "reply", ticketId: ticket.id, message: reply }, "Réponse envoyée"); setReply(""); } }}>Envoyer</Btn>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Btn onClick={() => void act("/api/admin/support", { action: "assign", ticketId: ticket.id }, "Assigné à vous")}>M&rsquo;assigner</Btn>
                      {["in_progress", "waiting_customer", "resolved", "closed"].map((st) => (
                        <Btn key={st} onClick={() => void act("/api/admin/support", { action: "status", ticketId: ticket.id, status: st }, `Statut → ${st}`)}>{st}</Btn>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm opacity-50">Sélectionne un ticket pour voir la conversation.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "billing" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Facturation</h2>
              <p className="text-sm opacity-60">Factures, transactions et événements de paiement</p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Factures</p>
              <Table
                head={["N°", "Client", "Montant", "Statut", "Émise", "Échéance"]}
                rows={((data.invoices as Row[]) ?? []).map((i) => [
                  s(i.number ?? i.id), s(i.advertiser_id ?? i.publisher_id ?? i.client),
                  money(i.total ?? i.amount, s(i.currency, "CDF")),
                  <Badge key="s" tone={statusTone(i.status)}>{s(i.status)}</Badge>,
                  dt(i.created_at), dt(i.due_date),
                ])}
                empty="Aucune facture"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Transactions</p>
              <Table
                head={["ID", "Type", "Montant", "Provider", "Statut", "Date"]}
                rows={((data.transactions as Row[]) ?? []).map((t) => [
                  s(t.id).slice(0, 12), s(t.type), money(t.amount, s(t.currency, "CDF")),
                  s(t.provider ?? t.gateway, "—"),
                  <Badge key="s" tone={statusTone(t.status)}>{s(t.status)}</Badge>, dt(t.created_at),
                ])}
                empty="Aucune transaction"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Événements webhook</p>
              <Table
                head={["Provider", "Event", "Transaction", "Statut", "Traité le"]}
                rows={((data.paymentEvents as Row[]) ?? []).map((e) => [
                  s(e.provider), s(e.event_id), s(e.transaction_id),
                  <Badge key="s" tone={statusTone(e.status)}>{s(e.status)}</Badge>, dt(e.processed_at),
                ])}
                empty="Aucun événement"
              />
            </div>
          </section>
        )}

        {tab === "network" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Réseau publicitaire</h2>
              <p className="text-sm opacity-60">
                {num((data.stats as Row)?.impressions)} impressions · {num((data.stats as Row)?.clicks)} clics · {num((data.stats as Row)?.adRequests)} requêtes
              </p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Applications sœurs autorisées</p>
              <Table
                head={["App", "Domaines"]}
                rows={((data.sisterApps as { slug: string; domains: string[] }[]) ?? []).map((a) => [
                  <Badge key="a" tone="info">{a.slug}</Badge>, a.domains.join(", "),
                ])}
                empty="—"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Campagnes</p>
              <Table
                head={["Nom", "Annonceur", "Budget", "Dépensé", "Statut"]}
                rows={((data.campaigns as Row[]) ?? []).map((c) => [
                  s(c.name), s(c.advertiser_id).slice(0, 10), money(c.budget_total ?? c.budget, s(c.currency, "CDF")),
                  money(c.budget_spent, s(c.currency, "CDF")),
                  <Badge key="s" tone={statusTone(c.status)}>{s(c.status)}</Badge>,
                ])}
                empty="Aucune campagne"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Annonceurs</p>
                <Table
                  head={["Nom", "Email", "Balance", "Statut"]}
                  rows={((data.advertisers as Row[]) ?? []).map((a) => [
                    s(a.company_name ?? a.name), s(a.email), money(a.balance, s(a.currency, "CDF")),
                    <Badge key="s" tone={statusTone(a.status)}>{s(a.status)}</Badge>,
                  ])}
                  empty="Aucun annonceur"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Éditeurs</p>
                <Table
                  head={["Nom", "Email", "Balance", "Statut"]}
                  rows={((data.publishers as Row[]) ?? []).map((p) => [
                    s(p.name), s(p.email), money(p.balance ?? p.pending_balance, s(p.currency, "CDF")),
                    <Badge key="s" tone={statusTone(p.status)}>{s(p.status)}</Badge>,
                  ])}
                  empty="Aucun éditeur"
                />
              </div>
            </div>
          </section>
        )}

        {tab === "content" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Contenu & accès</h2>
              <p className="text-sm opacity-60">Ayebi, sites Studio et clients OAuth</p>
            </header>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <Stat label="Articles Ayebi" value={num(((data.ayebi as Row)?.stats as Row)?.articles)} hint={`${num(((data.ayebi as Row)?.stats as Row)?.revisions)} révisions`} />
              <Stat label="Signalements ouverts" value={num(((data.ayebi as Row)?.stats as Row)?.openFlags)} />
              <Stat label="Sites Studio" value={num(((data.studio as Row)?.stats as Row)?.sites)} hint={`${num(((data.studio as Row)?.stats as Row)?.traceEvents)} events Trace`} />
              <Stat label="Clients OAuth" value={num(((data.oauth as Row)?.stats as Row)?.clients)} hint={`${num(((data.oauth as Row)?.stats as Row)?.tokens)} tokens actifs`} />
              <Stat label="Portails" value={num(((data.ayebi as Row)?.stats as Row)?.portals)} />
              <Stat label="Vues Ayebi" value={num(((data.ayebi as Row)?.stats as Row)?.pageViews)} />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Signalements Ayebi</p>
              <Table
                head={["Article", "Signalé par", "Raison", "Statut", "Date"]}
                rows={(((data.ayebi as Row)?.flags as Row[]) ?? []).map((f) => [
                  s(f.slug), s(f.reporter_name), s(f.reason),
                  <Badge key="s" tone={statusTone(f.status)}>{s(f.status)}</Badge>, dt(f.created_at),
                ])}
                empty="Aucun signalement"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Sites Studio</p>
                <Table
                  head={["Domaine", "Propriétaire", "Statut", "Ajouté"]}
                  rows={(((data.studio as Row)?.sites as Row[]) ?? []).map((st) => [
                    s(st.domain), s(st.owner_email), <Badge key="s" tone={statusTone(st.status)}>{s(st.status)}</Badge>, dt(st.created_at),
                  ])}
                  empty="Aucun site"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Clients OAuth</p>
                <Table
                  head={["Nom", "Propriétaire", "Tier", "Vérifié", "Créé"]}
                  rows={(((data.oauth as Row)?.clients as Row[]) ?? []).map((c) => [
                    s(c.name), s(c.owner_email), s(c.tier),
                    <Badge key="v" tone={num(c.verified) === 1 ? "ok" : "warn"}>{num(c.verified) === 1 ? "oui" : "non"}</Badge>,
                    dt(c.created_at),
                  ])}
                  empty="Aucun client"
                />
              </div>
            </div>
          </section>
        )}

        {tab === "search" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Recherche & Index</h2>
              <p className="text-sm opacity-60">
                {num(((data.index as Row)?.totalDocuments))} documents indexés · {num(((data.queue as Row)?.pending))} URLs en file
              </p>
            </header>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Documents indexés" value={num(((data.index as Row)?.totalDocuments)).toLocaleString("fr-CD")} hint={`${num(((data.index as Row)?.localDocuments))} locaux (RDC)`} />
              <Stat label="File de crawl" value={num(((data.queue as Row)?.pending))} hint={`${num(((data.queue as Row)?.failed))} en échec`} />
              <Stat label="Recherches totales" value={num(((data.queries as Row)?.totalSearches)).toLocaleString("fr-CD")} />
              <Stat label="Impressions 7j" value={num(((data.queries as Row)?.impressions7d))} hint={`${num(((data.queries as Row)?.clicks7d))} clics`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Top requêtes (7 jours)</p>
                <Table
                  head={["Requête", "Volume"]}
                  rows={(((data.queries as Row)?.top7d as Row[]) ?? []).map((x) => [s(x.query), num(x.n)])}
                  empty="Aucune requête enregistrée"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Requêtes récentes</p>
                <Table
                  head={["Requête", "Utilisateur", "Date"]}
                  rows={(((data.queries as Row)?.recent as Row[]) ?? []).map((x) => [s(x.query), s(x.user_email, "anonyme"), dt(x.created_at)])}
                  empty="—"
                />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Domaines les plus indexés</p>
                <Table
                  head={["Domaine", "Pages", "Crédibilité moy."]}
                  rows={(((data.index as Row)?.topDomains as Row[]) ?? []).map((x) => [s(x.domain), num(x.pages), `${(num(x.avg_credibility) * 100).toFixed(0)}%`])}
                  empty="Index vide"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Erreurs de crawl récentes</p>
                <Table
                  head={["URL", "Erreur", "Essais"]}
                  rows={(((data.queue as Row)?.recentErrors as Row[]) ?? []).map((x) => [s(x.url).slice(0, 45), s(x.last_error).slice(0, 50), num(x.attempts)])}
                  empty="Aucune erreur"
                />
              </div>
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Ayebi (encyclopédie)</p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Stat label="Articles" value={num(((data.articles as Row)?.total))} hint={`${num(((data.articles as Row)?.stubs))} ébauches`} />
                <Stat label="Vues cumulées" value={num(((data.articles as Row)?.views)).toLocaleString("fr-CD")} />
                <Stat label="Signalements" value={num(((data.articles as Row)?.flagged))} />
                <Stat label="Index par source" value={(((data.index as Row)?.bySourceType as Row[]) ?? []).map((x) => `${s(x.source_type)}: ${num(x.n)}`).join(" · ") || "—"} />
              </div>
            </div>
          </section>
        )}

        {tab === "ecosystem" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Écosystème</h2>
              <p className="text-sm opacity-60">
                {num(((data.totals as Row)?.clients))} clients OAuth · {num(((data.totals as Row)?.activeTokens))} tokens actifs · {num(((data.totals as Row)?.verified))} vérifiés
              </p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Applications sœurs</p>
              <Table
                head={["App", "Domaine", "Enregistrée", "Client ID", "Secret"]}
                rows={((data.sisters as Row[]) ?? []).map((a) => [
                  <Badge key="a" tone="info">{s(a.name)}</Badge>,
                  s(a.domain),
                  <Badge key="r" tone={a.registered ? "ok" : "warn"}>{a.registered ? "oui" : "non"}</Badge>,
                  <Badge key="c" tone={a.clientIdConfigured ? "ok" : "dim"}>{a.clientIdConfigured ? "configuré" : "défaut"}</Badge>,
                  <Badge key="s" tone={a.secretConfigured ? "ok" : "bad"}>{a.secretConfigured ? "configuré" : "manquant"}</Badge>,
                ])}
                empty="—"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Clients OAuth enregistrés</p>
              <Table
                head={["Nom", "Client ID", "Type", "Tier", "Propriétaire", "Tokens", "Consents", "Vérifié"]}
                rows={((data.clients as Row[]) ?? []).map((c) => [
                  s(c.name),
                  <code key="id" className="text-xs">{s(c.client_id).slice(0, 18)}…</code>,
                  s(c.client_type),
                  <Badge key="t" tone={statusTone(c.tier)}>{s(c.tier)}</Badge>,
                  s(c.owner_email, "système"),
                  num(c.active_tokens),
                  num(c.consents),
                  <Badge key="v" tone={c.verified ? "ok" : "dim"}>{c.verified ? "oui" : "non"}</Badge>,
                ])}
                empty="Aucun client"
              />
            </div>
          </section>
        )}

        {tab === "security" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Sécurité</h2>
              <p className="text-sm opacity-60">
                {num(((data.stats as Row)?.activeSessions))} sessions admin actives · {num(((data.stats as Row)?.failedLogins24h))} échecs de connexion (24 h)
              </p>
            </header>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Sessions admin actives" value={num(((data.stats as Row)?.activeSessions))} />
              <Stat label="Échecs login (24 h)" value={num(((data.stats as Row)?.failedLogins24h))} />
              <Stat label="Comptes avec 2FA" value={num(((data.stats as Row)?.users2fa))} />
              <Stat label="Tokens OAuth" value={num(((data.stats as Row)?.oauthTokens))} hint={`${num(((data.stats as Row)?.revokedTokens))} révoqués`} />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Sessions admin actives</p>
              <Table
                head={["Admin", "IP", "Appareil", "Ouverte", "Expire", "Action"]}
                rows={((data.sessions as Row[]) ?? []).map((x) => [
                  <span key="a">{s(x.admin_name)} <span className="opacity-50">({s(x.admin_email)})</span></span>,
                  s(x.ip, "—"),
                  <span key="ua" className="text-xs opacity-70">{s(x.user_agent).slice(0, 45)}</span>,
                  dt(x.created_at),
                  dt(x.expires_at),
                  <Btn key="r" danger onClick={() => {
                    if (window.confirm("Révoquer cette session admin ?")) {
                      void act("/api/admin/security", { action: "revoke", sessionId: x.id }, "Session révoquée");
                    }
                  }}>Révoquer</Btn>,
                ])}
                empty="Aucune session active"
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Tentatives de connexion admin</p>
                <Table
                  head={["Email", "IP", "Résultat", "Détail", "Date"]}
                  rows={((data.loginAttempts as Row[]) ?? []).map((x) => [
                    s(x.email), s(x.ip, "—"),
                    <Badge key="r" tone={x.success ? "ok" : "bad"}>{x.success ? "succès" : "échec"}</Badge>,
                    s(x.detail), dt(x.created_at),
                  ])}
                  empty="Aucune tentative"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Événements OAuth</p>
                <Table
                  head={["Événement", "Client", "IP", "Date"]}
                  rows={((data.oauthEvents as Row[]) ?? []).map((x) => [
                    <Badge key="e" tone={String(x.event_type).includes("denied") || String(x.event_type).includes("fail") ? "bad" : "info"}>{s(x.event_type)}</Badge>,
                    s(x.client_id).slice(0, 18), s(x.ip, "—"), dt(x.created_at),
                  ])}
                  empty="Aucun événement"
                />
              </div>
            </div>
          </section>
        )}

        {tab === "system" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Système</h2>
              <p className="text-sm opacity-60">
                Base <code>{s(((data.runtime as Row)?.dbMode))}</code> · {s(((data.runtime as Row)?.env))} · région {s(((data.runtime as Row)?.region))}
              </p>
            </header>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Mode base de données" value={<Badge tone={((data.runtime as Row)?.dbMode) === "turso" ? "ok" : "warn"}>{s(((data.runtime as Row)?.dbMode))}</Badge>} hint={s(((data.runtime as Row)?.node))} />
              <Stat label="Appels API (24 h)" value={num(((data.api24h as Row)?.calls))} hint={`${num(((data.api24h as Row)?.errors))} erreurs`} />
              <Stat label="Latence moy. API" value={`${num(((data.api24h as Row)?.avgLatencyMs))} ms`} />
              <Stat label="Heure serveur" value={dt(((data.runtime as Row)?.serverTime))} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Volumes par table</p>
                <Table
                  head={["Table", "Lignes"]}
                  rows={Object.entries(((data.tables as Record<string, number>) ?? {})).map(([t, n]) => [
                    <code key="t" className="text-xs">{t}</code>,
                    n < 0 ? <Badge key="n" tone="bad">absente</Badge> : n.toLocaleString("fr-CD"),
                  ])}
                  empty="—"
                />
              </div>
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Jobs récents</p>
                <Table
                  head={["Job", "Statut", "Démarré", "Terminé"]}
                  rows={((data.jobs as Row[]) ?? []).map((x) => [
                    s(x.job_type),
                    <Badge key="s" tone={statusTone(x.status)}>{s(x.status)}</Badge>,
                    dt(x.started_at), dt(x.finished_at),
                  ])}
                  empty="Aucun job enregistré"
                />
              </div>
            </div>
          </section>
        )}

        {tab === "broadcast" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Annonces</h2>
              <p className="text-sm opacity-60">
                Bandeaux diffusés sur ayeba.app — visibles par tous les visiteurs en temps réel
              </p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Nouvelle annonce</p>
              <div className="grid gap-3">
                <input
                  className="ayeba-input w-full"
                  placeholder="Titre (ex. Maintenance planifiée)"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                />
                <textarea
                  className="ayeba-input w-full"
                  rows={2}
                  placeholder="Message affiché dans le bandeau…"
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="ayeba-input"
                    value={annSeverity}
                    onChange={(e) => setAnnSeverity(e.target.value)}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Avertissement</option>
                    <option value="critical">Critique</option>
                  </select>
                  <Btn
                    onClick={async () => {
                      const res = await post("/api/admin/announcements", {
                        title: annTitle, body: annBody, severity: annSeverity, status: "active",
                      });
                      if (res) {
                        setAnnTitle(""); setAnnBody(""); setAnnSeverity("info");
                        flash("Annonce publiée — visible sur ayeba.app");
                        await loadTab(tab);
                      } else flash("Échec de publication");
                    }}
                  >
                    Publier maintenant
                  </Btn>
                  <Btn
                    onClick={async () => {
                      const res = await post("/api/admin/announcements", {
                        title: annTitle, body: annBody, severity: annSeverity, status: "draft",
                      });
                      if (res) {
                        setAnnTitle(""); setAnnBody("");
                        flash("Brouillon enregistré");
                        await loadTab(tab);
                      } else flash("Échec");
                    }}
                  >
                    Brouillon
                  </Btn>
                </div>
              </div>
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Annonces ({num(((data.announcements as Row[]) ?? []).length)})</p>
              <Table
                head={["Sévérité", "Titre", "Message", "Statut", "Créée", "Actions"]}
                rows={((data.announcements as Row[]) ?? []).map((a) => [
                  <Badge key="sev" tone={a.severity === "critical" ? "bad" : a.severity === "warning" ? "warn" : "info"}>
                    {s(a.severity)}
                  </Badge>,
                  s(a.title),
                  <span key="b" className="max-w-[280px] truncate inline-block">{s(a.body)}</span>,
                  <Badge key="st" tone={statusTone(a.status)}>{s(a.status)}</Badge>,
                  dt(a.created_at),
                  <span key="ac" className="flex gap-2">
                    {a.status !== "active" ? (
                      <Btn onClick={() => void patchAct("/api/admin/announcements", { id: a.id, status: "active" }, "Annonce activée")}>
                        Activer
                      </Btn>
                    ) : (
                      <Btn onClick={() => void patchAct("/api/admin/announcements", { id: a.id, status: "archived" }, "Annonce retirée")}>
                        Retirer
                      </Btn>
                    )}
                  </span>,
                ])}
                empty="Aucune annonce"
              />
            </div>
          </section>
        )}

        {tab === "incidents" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Incidents</h2>
              <p className="text-sm opacity-60">
                Journal opérationnel — publié sur la page /status (style status.google.com)
              </p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Déclarer un incident</p>
              <div className="grid gap-3">
                <input
                  className="ayeba-input w-full"
                  placeholder="Titre (ex. Latence élevée sur la recherche)"
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="ayeba-input"
                    value={incSeverity}
                    onChange={(e) => setIncSeverity(e.target.value)}
                  >
                    <option value="minor">Mineur</option>
                    <option value="major">Majeur</option>
                    <option value="critical">Critique</option>
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {((data.services as string[]) ?? []).map((svc) => (
                      <label key={svc} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={incServices.includes(svc)}
                          onChange={(e) =>
                            setIncServices((prev) =>
                              e.target.checked ? [...prev, svc] : prev.filter((x) => x !== svc),
                            )
                          }
                        />
                        {svc}
                      </label>
                    ))}
                  </div>
                  <Btn
                    onClick={async () => {
                      const res = await post("/api/admin/incidents", {
                        title: incTitle, severity: incSeverity, affectedServices: incServices,
                      });
                      if (res) {
                        setIncTitle(""); setIncSeverity("minor"); setIncServices([]);
                        flash("Incident déclaré — visible sur /status");
                        await loadTab(tab);
                      } else flash("Échec");
                    }}
                  >
                    Déclarer
                  </Btn>
                </div>
              </div>
            </div>
            {((data.incidents as Row[]) ?? []).map((inc) => (
              <div key={String(inc.id)} className="ayeba-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{s(inc.title)}</p>
                    <p className="text-xs opacity-60">
                      {s(inc.severity)} · {s(inc.author)} · {dt(inc.created_at)}
                      {((inc.affected_services as string[]) ?? []).length
                        ? ` · ${(inc.affected_services as string[]).join(" · ")}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone(inc.status)}>{s(inc.status)}</Badge>
                </div>
                <ol className="mt-3 space-y-2 border-l pl-3 text-xs" style={{ borderColor: "var(--line)" }}>
                  {((inc.updates as Row[]) ?? []).map((u, i) => (
                    <li key={i}>
                      <span className="opacity-50">{dt(u.created_at)} — {s(u.status)}</span>
                      <p className="opacity-80">{s(u.message)}</p>
                    </li>
                  ))}
                </ol>
                {inc.status !== "resolved" ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="ayeba-input min-w-[240px] flex-1"
                      placeholder="Message de mise à jour…"
                      value={incUpdateMsg[String(inc.id)] ?? ""}
                      onChange={(e) =>
                        setIncUpdateMsg((prev) => ({ ...prev, [String(inc.id)]: e.target.value }))
                      }
                    />
                    {["identified", "monitoring", "resolved"].map((st) => (
                      <Btn
                        key={st}
                        onClick={() =>
                          void patchAct("/api/admin/incidents", {
                            id: inc.id, status: st, message: incUpdateMsg[String(inc.id)] ?? "",
                          }, st === "resolved" ? "Incident résolu" : "Mise à jour publiée")
                        }
                      >
                        {st === "identified" ? "Cause identifiée" : st === "monitoring" ? "Surveillance" : "Résoudre"}
                      </Btn>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {!((data.incidents as Row[]) ?? []).length ? (
              <p className="py-6 text-center text-sm opacity-50">Aucun incident — tout est nominal.</p>
            ) : null}
          </section>
        )}

        {tab === "audit" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Journal & alertes</h2>
              <p className="text-sm opacity-60">Traçabilité des actions admin, alertes système et tâches</p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Alertes actives</p>
              <Table
                head={["Sévérité", "Titre", "Message", "Source", "Action"]}
                rows={((data.alerts as Row[]) ?? []).map((a) => [
                  <Badge key="s" tone={statusTone(a.severity)}>{s(a.severity)}</Badge>,
                  s(a.title), s(a.message), s(a.source),
                  <Btn key="r" onClick={() => void act("/api/admin/audit", { action: "resolve_alert", id: a.id }, "Alerte résolue")}>Résoudre</Btn>,
                ])}
                empty="Aucune alerte"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Tâches en attente</p>
              <Table
                head={["Type", "Priorité", "Statut", "Planifiée", "Action"]}
                rows={((data.tasks as Row[]) ?? []).map((t) => [
                  s(t.type), s(t.priority), <Badge key="s" tone={statusTone(t.status)}>{s(t.status)}</Badge>, dt(t.scheduledAt),
                  <Btn key="p" onClick={() => void act("/api/admin/audit", { action: "process_task", id: t.id }, "Tâche traitée")}>Traiter</Btn>,
                ])}
                empty="Aucune tâche"
              />
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Journal d&rsquo;audit</p>
              <Table
                head={["Admin", "Action", "Entité", "IP", "Date"]}
                rows={((data.logs as Row[]) ?? []).map((l) => [
                  s(l.adminName), s(l.action), `${s(l.entityType)} · ${s(l.entityId)}`, s(l.ipAddress), dt(l.timestamp),
                ])}
                empty="Aucun log"
              />
            </div>
          </section>
        )}

        {tab === "team" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Équipe admin</h2>
              <p className="text-sm opacity-60">Ajouter, suspendre ou retirer des administrateurs et changer leur rôle</p>
            </header>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Ajouter un administrateur</p>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAdminEmail.trim()) return;
                  void (async () => {
                    const res = await post("/api/admin/admins", {
                      action: "create",
                      email: newAdminEmail.trim(),
                      role: newAdminRole,
                    });
                    if (res) {
                      setNewAdminPassword((res.temporaryPassword as string) ?? null);
                      flash("Admin ajouté");
                      setNewAdminEmail("");
                      await loadTab("team");
                    } else {
                      flash("Échec — email invalide, déjà admin, ou droits insuffisants");
                    }
                  })();
                }}
              >
                <input
                  className="ayeba-input flex-1 min-w-56"
                  type="email"
                  placeholder="email du compte Ayeba existant…"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
                <select
                  className="ayeba-input"
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value)}
                >
                  {((data.roles as string[]) ?? ["super_admin", "manager", "support", "moderator", "analyst"]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <Btn onClick={() => undefined}>Ajouter</Btn>
              </form>
              {newAdminPassword ? (
                <div
                  className="mt-3 rounded-lg p-3 text-sm"
                  style={{ background: "rgba(34,197,94,0.10)", border: "1px solid #22c55e55" }}
                >
                  <p className="font-medium">Mot de passe provisoire (affiché une seule fois) :</p>
                  <p className="mt-1 select-all font-mono">{newAdminPassword}</p>
                  <p className="mt-1 text-xs opacity-60">Transmets-le à la personne — il ne sera plus visible après fermeture.</p>
                </div>
              ) : null}
              <p className="mt-2 text-xs opacity-50">Un compte est créé si nécessaire ; un mot de passe provisoire est généré à chaque ajout. Le rôle super_admin donne toutes les permissions.</p>
            </div>
            <div className="ayeba-panel p-4">
              <p className="ayeba-kicker mb-3">Administrateurs</p>
              <Table
                head={["Nom", "Email", "Rôle", "Statut", "Depuis", "Actions"]}
                rows={((data.admins as Row[]) ?? []).map((a) => [
                  s(a.name),
                  s(a.email),
                  <select
                    key="role"
                    className="ayeba-input py-0.5 text-xs"
                    value={s(a.role)}
                    onChange={(e) => void act("/api/admin/admins", { action: "update", id: a.id, role: e.target.value }, "Rôle mis à jour")}
                  >
                    {((data.roles as string[]) ?? []).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>,
                  <Badge key="s" tone={statusTone(a.status)}>{s(a.status)}</Badge>,
                  dt(a.createdAt),
                  <span key="a" className="flex gap-1">
                    {a.status === "active" ? (
                      <Btn danger onClick={() => void act("/api/admin/admins", { action: "update", id: a.id, status: "suspended" }, "Admin suspendu")}>Suspendre</Btn>
                    ) : (
                      <Btn onClick={() => void act("/api/admin/admins", { action: "update", id: a.id, status: "active" }, "Admin réactivé")}>Réactiver</Btn>
                    )}
                    <Btn danger onClick={() => { if (window.confirm(`Retirer ${s(a.email)} des admins ?`)) void act("/api/admin/admins", { action: "delete", id: a.id }, "Admin retiré"); }}>Retirer</Btn>
                  </span>,
                ])}
                empty="Aucun administrateur"
              />
            </div>
          </section>
        )}

        {tab === "chat" && (
          <section className="space-y-4">
            <header>
              <h2 className="text-xl font-semibold">Chat équipe</h2>
              <p className="text-sm opacity-60">Messagerie interne des administrateurs — canal équipe et messages directs</p>
            </header>
            <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
              <div className="ayeba-panel p-3">
                <p className="ayeba-kicker mb-2">Canaux</p>
                <button
                  onClick={() => setChatChannel("team")}
                  className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm"
                  style={chatChannel === "team" ? { background: "rgba(232,93,4,0.16)" } : { opacity: 0.7 }}
                >
                  # équipe
                </button>
                <p className="ayeba-kicker mb-2 mt-4">Messages directs</p>
                {chatMembers.filter((m) => m.id !== chatMe).map((m) => (
                  <button
                    key={s(m.id)}
                    onClick={() => setChatChannel(s(m.id))}
                    className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm"
                    style={chatChannel === m.id ? { background: "rgba(232,93,4,0.16)" } : { opacity: 0.7 }}
                  >
                    {s(m.name)} <span className="text-xs opacity-50">· {s(m.role)}</span>
                  </button>
                ))}
                {chatMembers.filter((m) => m.id !== chatMe).length === 0 && (
                  <p className="px-3 py-2 text-xs opacity-50">Aucun autre admin</p>
                )}
              </div>
              <div className="ayeba-panel flex flex-col p-4" style={{ minHeight: 420 }}>
                <div className="mb-3 border-b pb-2 text-sm font-medium" style={{ borderColor: "var(--line)" }}>
                  {chatChannel === "team"
                    ? "# équipe"
                    : `@ ${s(chatMembers.find((m) => m.id === chatChannel)?.name, "…")}`}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto" style={{ maxHeight: 380 }}>
                  {chatMessages.length === 0 && (
                    <p className="py-8 text-center text-sm opacity-50">Aucun message — lance la conversation.</p>
                  )}
                  {chatMessages.map((m) => {
                    const mine = m.admin_id === chatMe;
                    return (
                      <div key={s(m.id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[75%] rounded-xl px-3 py-2 text-sm"
                          style={{
                            background: mine ? "rgba(232,93,4,0.18)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${mine ? "#e85d0433" : "var(--line)"}`,
                          }}
                        >
                          {!mine && <p className="text-xs font-medium opacity-60">{s(m.admin_name)}</p>}
                          <p>{s(m.message)}</p>
                          <p className="mt-0.5 text-right text-[10px] opacity-40">{dt(m.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const msg = chatInput.trim();
                    if (!msg) return;
                    setChatInput("");
                    void (async () => {
                      const res = await post("/api/admin/chat", {
                        to: chatChannel === "team" ? "team" : chatChannel,
                        message: msg,
                      }) as { message?: Row } | null;
                      if (res?.message) setChatMessages((prev) => [...prev, res.message as Row]);
                      else flash("Envoi échoué");
                    })();
                  }}
                >
                  <input
                    className="ayeba-input flex-1"
                    placeholder="Message…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    maxLength={2000}
                  />
                  <Btn onClick={() => undefined}>Envoyer</Btn>
                </form>
              </div>
            </div>
          </section>
        )}

        {busy ? <p className="mt-4 text-xs opacity-50">Chargement…</p> : null}
      </main>
    </div>
  );
}
