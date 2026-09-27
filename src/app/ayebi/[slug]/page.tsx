import { AyebiArticleView } from "@/components/ayebi/AyebiArticleView";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { AYEBI_ARTICLES, getRelatedArticles } from "@/lib/ayebi";
import { getAyebiArticleEnriched, getBacklinks, getStoredArticle } from "@/lib/ayebi/server";
import { scoreArticleQuality } from "@/lib/ayebi/db-sqlite";
import { getSessionFromCookies } from "@/lib/auth-server";
import { authorFromSession } from "@/lib/ayebi/author";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return AYEBI_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getAyebiArticleEnriched(slug);
  if (!article) return { title: "Ayebi" };
  return {
    title: `${article.title} — Ayebi`,
    description: article.summary,
  };
}

export default async function AyebiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, stored, session, backlinks] = await Promise.all([
    getAyebiArticleEnriched(slug),
    getStoredArticle(slug),
    getSessionFromCookies(),
    Promise.resolve().then(() => getBacklinks(slug)),
  ]);
  if (!article) notFound();

  const author = session ? authorFromSession(session) : null;
  const scored = scoreArticleQuality(article);
  const articleWithScore = {
    ...article,
    quality: scored.quality,
    stub: scored.stub,
  };

  return (
    <>
      <AyebiStage />
      <AyebiArticleView
        article={articleWithScore}
        related={getRelatedArticles(slug)}
        backlinks={backlinks}
        canEdit={Boolean(session)}
        isAdmin={author?.role === "admin"}
        meta={
          stored
            ? {
                revision: stored.revision,
                updatedByName: stored.updatedByName,
                updatedAt: stored.updatedAt,
                protection: stored.protection,
                stub: scored.stub || stored.stub,
                viewCount: stored.viewCount,
                contributorCount: stored.contributorCount,
                createdByName: stored.createdByName,
                createdAt: stored.createdAt,
                qualityScore: scored,
              }
            : {
                revision: 1,
                updatedByName: "",
                updatedAt: "",
                protection: "none" as const,
                stub: scored.stub,
                viewCount: 0,
                contributorCount: 0,
                createdByName: "",
                createdAt: "",
                qualityScore: scored,
              }
        }
      />
    </>
  );
}
