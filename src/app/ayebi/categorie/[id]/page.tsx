import Link from "next/link";
import { notFound } from "next/navigation";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { listCategoryArticles } from "@/lib/ayebi/db-sqlite";
import { AYEBI_CATEGORIES } from "@/lib/ayebi/constants";

const CAT_MAP: Record<string, string> = {
  personnalites: "personnalité",
  lieux: "lieu",
  institutions: "institution",
  culture: "culture",
  sport: "sport",
  economie: "économie",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = AYEBI_CATEGORIES.find((c) => c.id === CAT_MAP[id] || c.id === id);
  return { title: cat ? `${cat.label} — Ayebi` : "Catégorie — Ayebi" };
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = AYEBI_CATEGORIES.find((c) => c.id === CAT_MAP[id] || c.id === id);
  if (!cat) notFound();
  const articles = listCategoryArticles(id);

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Ayebi</Link>
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">Catégories</Link>
          </div>
          <p className="ayeba-kicker ayeba-kicker-accent">Catégorie</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-white">{cat.label}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{articles.length} article{articles.length !== 1 ? "s" : ""} dans cette catégorie</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/ayebi/${a.slug}`}
                className="ayeba-panel block p-4 hover:border-[var(--line-bright)]"
              >
                {a.stub && (
                  <span className="mb-2 inline-block rounded-full border border-[rgba(255,200,0,0.4)] px-2 py-0.5 text-[9px] uppercase tracking-wider text-[rgba(255,200,0,0.8)]">
                    Ébauche
                  </span>
                )}
                <p className="font-medium text-white">{a.title}</p>
                <p className="mt-1 text-xs text-[var(--faint)]">{a.subtitle}</p>
                <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">{a.summary}</p>
              </Link>
            ))}
          </div>

          {!articles.length && (
            <div className="ayeba-panel mt-8 p-8 text-center text-[var(--muted)]">
              Aucun article dans cette catégorie.
              <Link href="/ayebi/nouveau" className="ayeba-pill mt-4 inline-block px-5 py-2 text-sm">
                Créer le premier
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
