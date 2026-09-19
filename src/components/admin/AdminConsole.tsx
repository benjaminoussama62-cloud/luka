"use client";

import { useCallback, useEffect, useState } from "react";

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
  | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "users", label: "Utilisateurs" },
  { id: "moderation", label: "Modération" },
  { id: "support", label: "Support" },
  { id: "billing", label: "Facturation" },
  { id: "network", label: "Réseau pubs" },
  { id: "content", label: "Contenu & accès" },
  { id: "audit", label: "Journal & alertes" },
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
}: {
  adminName: string;
  adminEmail: string;
  adminRole: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [data, setData] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // support detail state
  const [ticket, setTicket] = useState<Row | null>(null);
  const [reply, setReply] = useState("");
  const [userQuery, setUserQuery] = useState("");

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
          {TABS.map((t) => (
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
          <Badge tone="info">{adminRole}</Badge>
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
                head={["Nom", "Email", "Provider", "Rôle", "Inscrit le"]}
                rows={((data.users as Row[]) ?? []).map((u) => [
                  s(u.name), s(u.email), s(u.provider), <Badge key="r" tone={statusTone(u.role)}>{s(u.role)}</Badge>, dt(u.created_at),
                ])}
                empty="Aucun utilisateur"
              />
            </div>
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

        {busy ? <p className="mt-4 text-xs opacity-50">Chargement…</p> : null}
      </main>
    </div>
  );
}
