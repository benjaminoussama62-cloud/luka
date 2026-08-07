"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AyebiDiffView } from "@/components/ayebi/AyebiDiffView";
import type { DiffLine } from "@/lib/ayebi/diff";

type RevisionSummary = {
  revision: number;
  editSummary: string;
  authorName: string;
  createdAt: string;
};

export function AyebiHistoriqueClient({
  slug,
  title,
  revisions,
  canRestore,
}: {
  slug: string;
  title: string;
  revisions: RevisionSummary[];
  canRestore: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(revisions[0]?.revision ?? null);
  const [diff, setDiff] = useState<DiffLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function loadDiff(rev: number) {
    setSelected(rev);
    setLoading(true);
    const res = await fetch(`/api/ayebi/articles/${slug}/historique?rev=${rev}`);
    const data = (await res.json()) as { diff?: DiffLine[] };
    setDiff(data.diff ?? []);
    setLoading(false);
  }

  async function restore(rev: number) {
    if (!confirm(`Restaurer la révision ${rev} ?`)) return;
    setRestoring(true);
    const res = await fetch(`/api/ayebi/articles/${slug}/historique`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: rev }),
    });
    setRestoring(false);
    if (res.ok) {
      router.push(`/ayebi/${slug}`);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/ayebi/${slug}`} className="ayeba-ghost px-3 py-1.5 text-xs">
          ← {title}
        </Link>
        <Link href={`/ayebi/${slug}/discussion`} className="ayeba-ghost px-3 py-1.5 text-xs">
          Discussion
        </Link>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Historique</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Diff côte à côte · lien permanent vers chaque révision
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <ul className="ayeba-panel max-h-[70vh] divide-y divide-[var(--line)] overflow-y-auto">
          {revisions.map((r) => (
            <li key={r.revision}>
              <button
                type="button"
                onClick={() => loadDiff(r.revision)}
                className={`block w-full px-4 py-3 text-left text-sm transition ${
                  selected === r.revision ? "bg-[rgba(0,180,255,0.08)]" : "hover:bg-[rgba(255,255,255,0.03)]"
                }`}
              >
                <span className="font-mono text-[var(--accent)]">rev. {r.revision}</span>
                <p className="mt-1 text-white">{r.editSummary}</p>
                <p className="mt-1 text-[10px] text-[var(--faint)]">
                  {r.authorName} · {new Date(r.createdAt).toLocaleString("fr-FR")}
                </p>
                <Link
                  href={`/ayebi/${slug}/historique?rev=${r.revision}`}
                  className="mt-1 inline-block text-[10px] text-[var(--muted)] hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  Lien permanent
                </Link>
              </button>
            </li>
          ))}
        </ul>

        <div>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Chargement du diff…</p>
          ) : diff ? (
            <>
              <AyebiDiffView lines={diff} />
              {canRestore && selected ? (
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => restore(selected)}
                  className="ayeba-pill mt-4 px-5 py-2 text-sm"
                >
                  {restoring ? "Restauration…" : `Restaurer rev. ${selected}`}
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Sélectionnez une révision.</p>
          )}
        </div>
      </div>
    </div>
  );
}
