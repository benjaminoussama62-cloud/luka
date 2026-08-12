"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { StudioAppShell } from "@/components/studio/StudioAppShell";
import type { StudioSite } from "@/lib/studio/types";

type Verification = {
  meta: { label: string; html: string; hint: string };
  file: { label: string; path: string; body: string; hint: string };
  dns: { label: string; host: string; value: string; hint: string };
};

export default function StudioVerifyPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();
  const [site, setSite] = useState<StudioSite | null>(null);
  const [verification, setVerification] = useState<Verification | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace(`/ayebi/connexion?redirect=/studio/app/${siteId}/verify`);
  }, [ready, user, router, siteId]);

  useEffect(() => {
    if (!user || !siteId) return;
    void (async () => {
      const res = await fetch(`/api/studio/sites/${siteId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { site: StudioSite; verification: Verification };
      setSite(data.site);
      setVerification(data.verification);
      if (data.site.status === "verified") setOk(true);
    })();
  }, [user, siteId]);

  async function runVerify() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/studio/sites/${siteId}/verify`, { method: "POST" });
    const data = (await res.json()) as {
      ok: boolean;
      detail: string;
      site?: StudioSite;
    };
    setBusy(false);
    setMessage(data.detail);
    setOk(Boolean(data.ok));
    if (data.site) setSite(data.site);
    if (data.ok) {
      setTimeout(() => router.push(`/studio/app/${siteId}/radar`), 800);
    }
  }

  if (!site) {
    return (
      <StudioAppShell siteId={siteId}>
        <p className="text-sm text-[var(--muted)]">Chargement…</p>
      </StudioAppShell>
    );
  }

  return (
    <StudioAppShell siteId={siteId} siteDomain={site.domain}>
      <p className="ayeba-kicker ayeba-kicker-accent">Propriété</p>
      <h1 className="mt-2 font-[family-name:var(--font-brand)] text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em] text-[var(--ink)]">
        Vérifier {site.domain}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        Une seule méthode suffit. Choisissez la plus rapide pour vous, puis lancez la vérification.
      </p>

      {ok ? (
        <p className="mt-6 text-sm text-[var(--accent)]">Site vérifié. Ouverture de Radar…</p>
      ) : null}

      {verification ? (
        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          <section>
            <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
              {verification.meta.label}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{verification.meta.hint}</p>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all border border-[var(--line)] bg-black/20 p-4 text-[11px] text-[var(--ink)]">
              {verification.meta.html}
            </pre>
          </section>
          <section>
            <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
              {verification.file.label}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{verification.file.hint}</p>
            <p className="mt-4 text-xs text-[var(--faint)]">{verification.file.path}</p>
            <pre className="mt-2 overflow-x-auto border border-[var(--line)] bg-black/20 p-4 text-[11px] text-[var(--ink)]">
              {verification.file.body}
            </pre>
          </section>
          <section>
            <h2 className="font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">
              {verification.dns.label}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{verification.dns.hint}</p>
            <p className="mt-4 text-xs text-[var(--faint)]">Hôte : {verification.dns.host}</p>
            <pre className="mt-2 overflow-x-auto border border-[var(--line)] bg-black/20 p-4 text-[11px] text-[var(--ink)]">
              {verification.dns.value}
            </pre>
          </section>
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button type="button" className="ayeba-cta h-11 px-6 text-sm" disabled={busy || ok} onClick={() => void runVerify()}>
          {busy ? "Vérification…" : "Lancer la vérification"}
        </button>
        {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </StudioAppShell>
  );
}
