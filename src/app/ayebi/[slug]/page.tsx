import { AyebiArticleView } from "@/components/ayebi/AyebiArticleView";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { AYEBI_ARTICLES, getRelatedArticles } from "@/lib/ayebi";
import { getAyebiArticleEnriched, getStoredArticle } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";
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
  const [article, stored, session] = await Promise.all([
    getAyebiArticleEnriched(slug),
    getStoredArticle(slug),
    getSessionFromCookies(),
  ]);
  if (!article) notFound();

  return (
    <>
      <AyebiStage />
      <AyebiArticleView
        article={article}
        related={getRelatedArticles(slug)}
        canEdit={Boolean(session)}
        meta={
          stored
            ? {
                revision: stored.revision,
                updatedByName: stored.updatedByName,
                updatedAt: stored.updatedAt,
              }
            : null
        }
      />
    </>
  );
}
