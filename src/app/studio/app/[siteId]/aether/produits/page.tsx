"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import { Badge, DataTable, Metric, MetricGrid, SectionTitle } from "@/components/studio/ui";
import type { StudioSite } from "@/lib/studio/types";

type Products = {
  totals: { products: number; inStock: number; avgPrice: number | null };
  products: Array<{
    id: string; title: string; price: number | null; currency: string;
    url: string; thumb: string | null; rating: number | null;
    category: string; inStock: boolean; indexedAt: string;
  }>;
  site: StudioSite;
};

export default function AetherProduitsPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Products | null>(null);

  const load = useCallback(async () => {
    if (!siteId) return;
    const res = await fetch(`/api/studio/aether/${siteId}/products`);
    if (res.ok) setData(await res.json());
  }, [siteId]);

  useEffect(() => { if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/aether/produits`); }, [ready, user, router, siteId]);
  useEffect(() => { if (user) void load(); }, [user, load]);

  if (!data) {
    return <StudioAppShell siteId={siteId}><p className="text-sm text-[var(--muted)]">Chargement…</p></StudioAppShell>;
  }
  const t = data.totals;

  return (
    <StudioAppShell siteId={siteId} siteDomain={data.site.domain}>
      <div>
        <p className="ayeba-kicker ayeba-kicker-accent">Aether · Produits</p>
        <h1 className="mt-2 font-[family-name:var(--font-brand)] text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Catalogue produits
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Produits détectés et indexés par le crawler Ayeba sur votre domaine —
          ils peuvent apparaître dans les résultats Shopping.
        </p>
      </div>

      <div className="mt-8">
        <MetricGrid>
          <Metric label="Produits indexés" value={String(t.products)} />
          <Metric label="En stock" value={String(t.inStock)} />
          <Metric label="Prix moyen" value={t.avgPrice != null ? `${t.avgPrice.toLocaleString("fr-FR")}` : "—"} />
        </MetricGrid>
      </div>

      <section className="mt-10">
        <SectionTitle title="Produits détectés" />
        <div className="mt-4">
          <DataTable
            columns={["Produit", "Prix", "Catégorie", "Note", "Stock", "Indexé le"]}
            rows={data.products.map((p) => [
              <span key="t">
                <span className="block max-w-[260px] truncate font-medium text-[var(--ink)]" title={p.title}>{p.title}</span>
                <span className="block max-w-[260px] truncate text-xs text-[var(--faint)]" title={p.url}>{p.url}</span>
              </span>,
              p.price != null ? `${p.price.toLocaleString("fr-FR")} ${p.currency}` : "—",
              p.category || "—",
              p.rating != null ? `${p.rating}/5` : "—",
              <Badge key="s" tone={p.inStock ? "good" : "warn"}>{p.inStock ? "En stock" : "Épuisé"}</Badge>,
              p.indexedAt?.slice(0, 10) || "—",
            ])}
            empty="Aucun produit détecté — le crawler indexe automatiquement les fiches produit balisées"
          />
        </div>
      </section>
    </StudioAppShell>
  );
}
