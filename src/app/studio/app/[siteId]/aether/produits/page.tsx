"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Issue = { line: number; severity: "error" | "warning"; message: string; field?: string };

type IssueCounts = { products: number; errors: number; warnings: number; ok: number };

type Products = {
  totals: { products: number; inStock: number; avgPrice: number | null };
  products: Array<{
    id: string;
    title: string;
    price: number | null;
    currency: string;
    url: string;
    thumb: string | null;
    rating: number | null;
    category: string;
    inStock: boolean;
    indexedAt: string;
  }>;
  site: StudioSite;
  imported?: number;
  updated?: number;
  issues?: Issue[];
  issueCounts?: IssueCounts;
};

export default function AetherProduitsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Products | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/aether/${siteId}/products`);
    if (res.ok) setData(await res.json());
  }, [siteId]);

  useEffect(() => {
    if (ready && !user)
      router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/aether/produits`);
  }, [ready, user, router, siteId]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("feed") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setMsg("Choisissez un fichier TSV ou CSV.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setIssues([]);
    const text = await file.text();
    const res = await fetch(`/api/studio/aether/${siteId}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feed: text }),
    });
    const body = (await res.json()) as Products & { error?: string };
    setBusy(false);
    if (!res.ok) {
      setMsg(body.error || "Import impossible");
      return;
    }
    setData(body);
    setIssues(body.issues || []);
    setMsg(
      `Import terminé : ${body.imported ?? 0} nouveaux, ${body.updated ?? 0} mis à jour` +
        (body.issues?.length ? ` · ${body.issues.length} diagnostic(s)` : ""),
    );
    form.reset();
  }

  if (!data) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }
  const t = data.totals;
  const ic = data.issueCounts;
  const importErrors = issues.filter((i) => i.severity === "error").length;
  const importWarnings = issues.filter((i) => i.severity === "warning").length;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Aether · Merchant</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Catalogue produits
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Produits crawlés + feed Merchant (TSV/CSV type Google Shopping) — diagnostics de
          désapprobation inclus.
        </p>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Produits indexés" value={String(t.products)} />
          <Metric label="En stock" value={String(t.inStock)} />
          <Metric
            label="Prix moyen"
            value={t.avgPrice != null ? `${t.avgPrice.toLocaleString("fr-FR")}` : "—"}
          />
          <Metric
            label="Erreurs catalogue"
            value={String(ic?.errors ?? 0)}
            hint="title / URL manquants"
          />
          <Metric
            label="Avertissements"
            value={String(ic?.warnings ?? 0)}
            hint="prix, image ou catégorie"
          />
        </MetricGrid>
      </div>

      <form onSubmit={(e) => void onUpload(e)} className="ayeba-panel mt-10 p-5">
        <SectionTitle title="Importer un feed Merchant" />
        <p className="mt-2 text-xs text-[var(--muted)]">
          Colonnes : id, title, link, price, image_link, availability, brand,
          google_product_category — séparateur tabulation ou virgule.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            name="feed"
            type="file"
            accept=".tsv,.csv,.txt,text/tab-separated-values,text/csv"
            className="ayeba-input max-w-md text-xs file:mr-3"
          />
          <button type="submit" className="ayeba-cta h-10 px-5 text-xs" disabled={busy}>
            {busy ? "Import…" : "Importer le feed"}
          </button>
          <a
            className="ayeba-ghost inline-flex h-10 items-center px-4 text-xs"
            href={`/api/studio/aether/${siteId}/products?template=1`}
            download
          >
            Télécharger le modèle TSV
          </a>
        </div>
        {msg ? <p className="mt-3 text-sm text-[var(--accent)]">{msg}</p> : null}
        {issues.length > 0 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Dernier import —{" "}
            <Badge tone="bad">{importErrors} erreur(s)</Badge>{" "}
            <Badge tone="warn">{importWarnings} avertissement(s)</Badge>
          </p>
        ) : null}
      </form>

      {issues.length > 0 ? (
        <section className="mt-8">
          <SectionTitle
            title="Diagnostics feed"
            aside={
              <span className="flex gap-2">
                <Badge tone="bad">{importErrors} err.</Badge>
                <Badge tone="warn">{importWarnings} warn.</Badge>
              </span>
            }
          />
          <div className="ayeba-panel mt-4 max-h-64 overflow-auto divide-y divide-[var(--line)]">
            {issues.slice(0, 40).map((iss, i) => (
              <div key={`${iss.line}-${i}`} className="flex items-start gap-3 px-4 py-2 text-xs">
                <Badge tone={iss.severity === "error" ? "bad" : "warn"}>
                  L{iss.line} · {iss.severity}
                </Badge>
                <span className="text-[var(--muted)]">
                  {iss.field ? `[${iss.field}] ` : ""}
                  {iss.message}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <SectionTitle title="Produits indexés" />
        <div className="mt-4">
          <DataTable
            columns={["Produit", "Prix", "Catégorie", "Note", "Stock", "Indexé le"]}
            rows={data.products.map((p) => [
              <span key="t">
                <span
                  className="block max-w-[260px] truncate font-medium text-[var(--ink)]"
                  title={p.title}
                >
                  {p.title}
                </span>
                <span className="block max-w-[260px] truncate text-xs text-[var(--faint)]" title={p.url}>
                  {p.url}
                </span>
              </span>,
              p.price != null ? `${p.price.toLocaleString("fr-FR")} ${p.currency}` : "—",
              p.category || "—",
              p.rating != null ? `${p.rating}/5` : "—",
              <Badge key="s" tone={p.inStock ? "good" : "warn"}>
                {p.inStock ? "En stock" : "Épuisé"}
              </Badge>,
              p.indexedAt?.slice(0, 10) || "—",
            ])}
            empty="Aucun produit — importez un feed Merchant ou laissez le crawler indexer vos fiches"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
