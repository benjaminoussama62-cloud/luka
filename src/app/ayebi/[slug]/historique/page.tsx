import { AyebiHistoriqueClient } from "@/components/ayebi/AyebiHistoriqueClient";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getRevisions, getStoredArticle } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = await getStoredArticle(slug);
  return { title: stored ? `Historique — ${stored.title}` : "Historique — Ayebi" };
}

export default async function AyebiHistoriquePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [stored, session, revisions] = await Promise.all([
    getStoredArticle(slug),
    getSessionFromCookies(),
    Promise.resolve(getRevisions(slug, 50)),
  ]);

  if (!stored) notFound();

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <AyebiHistoriqueClient
          slug={slug}
          title={stored.title}
          revisions={revisions.map((r) => ({
            revision: r.revision,
            editSummary: r.editSummary,
            authorName: r.authorName,
            createdAt: r.createdAt,
          }))}
          canRestore={Boolean(session)}
        />
      </div>
    </>
  );
}
