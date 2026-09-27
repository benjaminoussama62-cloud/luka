import Link from "next/link";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getRecentEdits } from "@/lib/ayebi/server";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Modifications récentes — Ayebi",
};

export default async function AyebiRecentPage() {
  const edits = await getRecentEdits(80);

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">
              ← Ayebi
            </Link>
            <Link href="/ayebi/watchlist" className="ayeba-ghost px-3 py-1.5 text-xs">
              Liste de suivi
            </Link>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">
            Modifications récentes
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Dernières révisions de l&apos;encyclopédie Ayebi — flux global, tous articles.
          </p>

          {edits.length ? (
            <ul className="ayeba-panel mt-8 divide-y divide-[var(--line)]">
              {edits.map((e) => (
                <li key={`${e.slug}-${e.revision}`} className="px-5 py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/ayebi/${e.slug}`}
                      className="font-medium text-white hover:underline"
                    >
                      {e.title}
                    </Link>
                    <Link
                      href={`/ayebi/${e.slug}/historique`}
                      className="font-mono text-[10px] text-[var(--accent)] hover:underline"
                    >
                      rev. {e.revision}
                    </Link>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{e.editSummary || "Modification"}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--faint)]">
                    {e.authorName} · {new Date(e.createdAt).toLocaleString("fr-FR")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ayeba-panel mt-8 p-8 text-center text-[var(--muted)]">
              <p>Aucune modification communautaire pour l&apos;instant.</p>
              <Link href="/ayebi/connexion" className="ayeba-pill mt-4 inline-block px-5 py-2 text-sm">
                Devenir contributeur
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
