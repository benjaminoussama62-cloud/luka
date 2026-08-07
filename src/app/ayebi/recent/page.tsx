import Link from "next/link";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getRecentEdits } from "@/lib/ayebi/server";

export const metadata = {
  title: "Modifications récentes — Ayebi",
};

export default async function AyebiRecentPage() {
  const edits = await getRecentEdits(40);

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Modifications récentes</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Historique des contributions à l&apos;encyclopédie Ayebi.</p>

          {edits.length ? (
            <ul className="ayeba-panel mt-8 divide-y divide-[var(--line)]">
              {edits.map((e) => (
                <li key={`${e.slug}-${e.revision}`} className="px-5 py-4">
                  <Link href={`/ayebi/${e.slug}`} className="font-medium text-white hover:underline">
                    {e.title}
                  </Link>
                  <p className="mt-1 text-sm text-[var(--muted)]">{e.editSummary}</p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--faint)]">
                    {e.authorName} · rev. {e.revision} · {new Date(e.createdAt).toLocaleString("fr-FR")}
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
