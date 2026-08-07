import Link from "next/link";
import { redirect } from "next/navigation";
import { AyebiEditor } from "@/components/ayebi/AyebiEditor";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getAyebiArticleLive } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";

export default async function ModifierFichePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) redirect(`/ayebi/connexion?redirect=/ayebi/${(await params).slug}/modifier`);

  const { slug } = await params;
  const article = await getAyebiArticleLive(slug);
  if (!article) redirect("/ayebi/nouveau");

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mb-8">
          <Link href={`/ayebi/${slug}`} className="ayeba-ghost px-3 py-1.5 text-xs">
            ← {article.title}
          </Link>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl text-white">Modifier</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Décrivez vos changements dans le résumé de modification avant d&apos;enregistrer.
          </p>
        </div>
        <AyebiEditor mode="edit" initial={article} />
      </div>
    </>
  );
}
