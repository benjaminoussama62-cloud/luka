import Link from "next/link";
import { redirect } from "next/navigation";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getUserWatchlist, getArticle } from "@/lib/ayebi/db-sqlite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Liste de suivi — Ayebi" };

export default async function WatchlistPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/ayebi/connexion?redirect=/ayebi/watchlist");

  const slugs = getUserWatchlist(session.id);
  const articles = slugs.map((s) => getArticle(s)).filter(Boolean);

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Ayebi</Link>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Liste de suivi</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Articles que vous surveillez. Vous serez notifié des modifications.
          </p>

          {articles.length > 0 ? (
            <ul className="ayeba-panel mt-8 divide-y divide-[var(--line)]">
              {articles.map((a) => a && (
                <li key={a.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <Link href={`/ayebi/${a.slug}`} className="font-medium text-white hover:underline">
                      {a.title}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--faint)] capitalize">{a.category}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/ayebi/${a.slug}/historique`} className="ayeba-ghost px-3 py-1 text-xs">
                      Historique
                    </Link>
                    <Link href={`/ayebi/${a.slug}`} className="ayeba-ghost px-3 py-1 text-xs">
                      Lire
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ayeba-panel mt-8 p-8 text-center text-[var(--muted)]">
              <p>Aucun article suivi. Cliquez sur &quot;Suivre&quot; sur n&apos;importe quelle fiche.</p>
              <Link href="/ayebi" className="ayeba-pill mt-4 inline-block px-5 py-2 text-sm">
                Explorer Ayebi
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
