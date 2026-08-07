import Link from "next/link";
import { redirect } from "next/navigation";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getAllArticlesMerged, getRecentEdits, getStoredArticles } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";

export const metadata = {
  title: "Espace contributeur — Ayebi",
};

export default async function ContribuerPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/ayebi/connexion?redirect=/ayebi/contribuer");

  const [myEdits, stored, total] = await Promise.all([
    Promise.resolve(getRecentEdits(50)).then((all) =>
      all.filter((e) => e.authorId === session.id).slice(0, 15),
    ),
    getStoredArticles().then((a) => a.filter((x) => x.updatedBy === session.id)),
    getAllArticlesMerged().then((a) => a.length),
  ]);

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Bonjour, {session.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Vous contribuez à Ayebi — encyclopédie libre 100&nbsp;% RDC. {total} fiches au catalogue.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/ayebi/nouveau" className="ayeba-pill px-5 py-2.5 text-sm">
              + Nouvelle fiche
            </Link>
            <Link href="/ayebi/recent" className="ayeba-ghost px-5 py-2.5 text-sm">
              Modifications récentes
            </Link>
          </div>

          {stored.length ? (
            <section className="mt-10">
              <h2 className="ayeba-kicker mb-4">Vos fiches modifiées</h2>
              <ul className="ayeba-panel divide-y divide-[var(--line)]">
                {stored.map((a) => (
                  <li key={a.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <Link href={`/ayebi/${a.slug}`} className="text-white hover:underline">
                        {a.title}
                      </Link>
                      <p className="text-[10px] text-[var(--faint)]">rev. {a.revision}</p>
                    </div>
                    <Link href={`/ayebi/${a.slug}/modifier`} className="ayeba-ghost px-3 py-1 text-xs">
                      Modifier
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {myEdits.length ? (
            <section className="mt-10">
              <h2 className="ayeba-kicker mb-4">Vos dernières modifications</h2>
              <ul className="ayeba-panel divide-y divide-[var(--line)]">
                {myEdits.map((e) => (
                  <li key={`${e.slug}-${e.revision}`} className="px-5 py-3 text-sm">
                    <Link href={`/ayebi/${e.slug}`} className="text-white">
                      {e.title}
                    </Link>
                    <span className="text-[var(--muted)]"> — {e.editSummary}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
