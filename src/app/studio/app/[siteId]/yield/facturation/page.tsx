"use client";
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, Metric, MetricGrid, ModuleNav, SectionTitle } from "@/components/studio/ui";
import { YIELD_NAV } from "@/components/studio/yield-nav";
import type { StudioSite } from "@/lib/studio/types";

type Billing = {
  balance: number; currency: string;
  invoices: Array<{ id: string; number: string; amount: number; currency: string; status: string; dueDate: string; periodStart: string; periodEnd: string; createdAt: string }>;
  transactions: Array<{ id: string; type: string; amount: number; currency: string; status: string; provider: string; createdAt: string }>;
};

const INV_STATUS: Record<string, [string, "good" | "warn" | "bad" | "neutral"]> = {
  paid: ["Payée", "good"], pending: ["En attente", "warn"], overdue: ["En retard", "bad"],
  draft: ["Brouillon", "neutral"], cancelled: ["Annulée", "neutral"],
};
const TX_STATUS: Record<string, [string, "good" | "warn" | "bad" | "neutral"]> = {
  processed: ["Confirmée", "good"], pending: ["En cours", "warn"], failed: ["Échouée", "bad"],
  refunded: ["Remboursée", "neutral"],
};

export default function YieldFacturationPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [payMsg, setPayMsg] = useState("");
  const [paying, setPaying] = useState("");

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/yield/${siteId}/billing`);
    if (res.ok) { const d = await res.json(); setSite(d.site); setBilling(d.billing); }
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/yield/facturation`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const pay = async (invoiceId: string) => {
    setPaying(invoiceId); setPayMsg("");
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Paiement impossible");
      if (d.checkoutUrl) window.location.href = d.checkoutUrl;
      else setPayMsg("Paiement initié — suivez les instructions sur votre téléphone.");
    } catch (e) {
      setPayMsg(e instanceof Error ? e.message : "Erreur");
    } finally { setPaying(""); }
  };

  if (!billing) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const pending = billing.invoices.filter((i) => i.status === "pending" || i.status === "overdue");
  const pendingTotal = pending.reduce((a, i) => a + i.amount, 0);

  return (
    <StudioAppShell siteId={siteId} siteDomain={site?.domain}>
      <ModuleNav siteId={siteId} module="yield" items={YIELD_NAV} />
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Yield · Facturation</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Facturation & paiements
        </h1>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Solde" value={`${billing.balance.toLocaleString("fr-FR")} ${billing.currency}`} />
          <Metric label="Factures en attente" value={String(pending.length)} />
          <Metric label="Montant dû" value={`${pendingTotal.toLocaleString("fr-FR")} ${billing.currency}`} />
          <Metric label="Transactions" value={String(billing.transactions.length)} />
        </MetricGrid>
      </div>
      {payMsg ? <p className="mt-4 text-sm text-[var(--accent)]">{payMsg}</p> : null}

      <section className="mt-10">
        <SectionTitle title="Factures" />
        <div className="mt-4">
          <DataTable
            columns={["Facture", "Période", "Montant", "Échéance", "Statut", "Action"]}
            rows={billing.invoices.map((i) => [
              <span key="n" className="font-medium text-[var(--ink)]">{i.number || i.id.slice(0, 8)}</span>,
              `${(i.periodStart || "").slice(0, 10)} → ${(i.periodEnd || "").slice(0, 10)}`,
              `${i.amount.toLocaleString("fr-FR")} ${i.currency}`,
              (i.dueDate || "").slice(0, 10) || "—",
              <Badge key="s" tone={INV_STATUS[i.status]?.[1] || "neutral"}>{INV_STATUS[i.status]?.[0] || i.status}</Badge>,
              i.status === "pending" || i.status === "overdue" ? (
                <button
                  key="p"
                  type="button"
                  className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
                  disabled={paying === i.id}
                  onClick={() => void pay(i.id)}
                >
                  {paying === i.id ? "Redirection…" : "Payer"}
                </button>
              ) : "—",
            ])}
            empty="Aucune facture — les frais publicitaires seront facturés ici"
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle title="Transactions" />
        <div className="mt-4">
          <DataTable
            columns={["Date", "Type", "Montant", "Provider", "Statut"]}
            rows={billing.transactions.map((t) => [
              (t.createdAt || "").slice(0, 16).replace("T", " "),
              t.type,
              `${t.amount.toLocaleString("fr-FR")} ${t.currency}`,
              t.provider || "—",
              <Badge key="s" tone={TX_STATUS[t.status]?.[1] || "neutral"}>{TX_STATUS[t.status]?.[0] || t.status}</Badge>,
            ])}
            empty="Aucune transaction"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
