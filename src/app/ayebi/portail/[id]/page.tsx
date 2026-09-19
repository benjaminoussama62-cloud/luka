import Link from "next/link";
import { notFound } from "next/navigation";
import { AyebiStage } from "@/components/ayebi/AyebiStage";
import { getPortal, getPortalArticles } from "@/lib/ayebi/db-sqlite";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portal = getPortal(id);
  return { title: portal ? `Portail:${portal.title} — Ayebi` : "Portail — Ayebi" };
}

export default async function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const portal = getPortal(id);
  if (!portal) notFound();
  const articles = getPortalArticles(id, 60);

  const byCategory = articles.reduce<Record<string, typeof articles>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  return (
    <>
      <AyebiStage />
      <div className="relative z-10 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Ayebi</Link>
          </div>

          <div className="ayeba-panel overflow-hidden">
            {portal.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portal.image} alt="" className="h-40 w-full object-cover opacity-80" />
            )}
            <div className="p-6">
              <p className="ayeba-kicker ayeba-kicker-accent">Portail thématique</p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-white">
                Portail : {portal.title}
              </h1>
              {portal.description && (
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{portal.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {portal.tags.map((t) => (
                  <span key={t} className="ayeba-ghost rounded-full px-3 py-1 text-xs">{t}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 ayeba-panel p-4 text-right">
            <p className="ayeba-kicker ayeba-kicker-accent">Articles</p>
            <p className="font-[family-name:var(--font-display)] text-3xl text-white">{articles.length}</p>
          </div>

          {Object.entries(byCategory).map(([cat, arts]) => (
            <section key={cat} className="mt-10">
              <h2 className="ayeba-kicker mb-4 capitalize">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {arts.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/ayebi/${a.slug}`}
                    className="ayeba-panel block p-4 hover:border-[var(--line-bright)]"
                  >
                    <p className="font-medium text-white">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{a.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}

          {!articles.length && (
            <div className="ayeba-panel mt-8 p-8 text-center text-[var(--muted)]">
              Aucun article associé à ce portail pour l&apos;instant.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
