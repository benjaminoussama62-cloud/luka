import { AyebiDiscussionClient } from "@/components/ayebi/AyebiDiscussionClient";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getStoredArticle, getTalkMessages } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stored = await getStoredArticle(slug);
  return { title: stored ? `Discussion — ${stored.title}` : "Discussion — Ayebi" };
}

export default async function AyebiDiscussionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [stored, session] = await Promise.all([getStoredArticle(slug), getSessionFromCookies()]);

  if (!stored) notFound();

  const messages = getTalkMessages(slug, 80).reverse();

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <AyebiDiscussionClient
          slug={slug}
          title={stored.title}
          initialMessages={messages}
          canPost={Boolean(session)}
        />
      </div>
    </>
  );
}
