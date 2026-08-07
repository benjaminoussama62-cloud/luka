"use client";

import Link from "next/link";
import { AyebiMarkupText } from "@/components/ayebi/AyebiMarkupText";
import type { AyebiArticle } from "@/lib/ayebi/types";

export function AyebiArticleView({
  article,
  related,
  canEdit = false,
  meta,
}: {
  article: AyebiArticle;
  related: AyebiArticle[];
  canEdit?: boolean;
  meta?: { revision: number; updatedByName: string; updatedAt: string } | null;
}) {
  const sections =
    article.sections ??
    (article.body.length ? [{ heading: "Article", paragraphs: article.body }] : []);

  return (
    <article className="relative z-10 min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">
              ← Encyclopédie
            </Link>
            {canEdit ? (
              <Link href={`/ayebi/${article.slug}/modifier`} className="ayeba-pill px-4 py-2 text-xs">
                Modifier
              </Link>
            ) : (
              <Link href={`/ayebi/connexion?redirect=/ayebi/${article.slug}/modifier`} className="ayeba-ghost px-4 py-2 text-xs">
                Se connecter pour modifier
              </Link>
            )}
            <Link href={`/ayebi/${article.slug}/historique`} className="ayeba-ghost px-3 py-2 text-xs">
              Historique
            </Link>
            <Link href={`/ayebi/${article.slug}/discussion`} className="ayeba-ghost px-3 py-2 text-xs">
              Discussion
            </Link>
          </div>

          <p className="ayeba-kicker ayeba-kicker-accent capitalize">{article.category}</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-medium text-white sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-3 text-lg text-[var(--muted)]">{article.subtitle}</p>

          {meta ? (
            <p className="mt-2 font-mono text-[10px] text-[var(--faint)]">
              Dernière modification · {meta.updatedByName} · rev. {meta.revision} ·{" "}
              {new Date(meta.updatedAt).toLocaleString("fr-FR")}
            </p>
          ) : null}

          {article.image ? (
            <div className="ayeba-panel mt-8 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.image} alt="" className="h-48 w-full object-cover opacity-90" />
            </div>
          ) : null}

          <p className="ayeba-lead mt-8">{article.summary}</p>

          {sections.map((sec) => (
            <section key={sec.heading} className="mt-10">
              <h2 className="font-[family-name:var(--font-display)] text-xl text-white">{sec.heading}</h2>
              <div className="mt-4 space-y-4 text-[15px] leading-[1.85] text-[var(--muted)]">
                {sec.paragraphs.map((p) => (
                  <p key={p.slice(0, 32)}>
                    <AyebiMarkupText text={p} />
                  </p>
                ))}
              </div>
            </section>
          ))}

          {article.timeline?.length ? (
            <section className="ayeba-panel mt-10 p-6">
              <p className="ayeba-kicker mb-5">Chronologie</p>
              <ol className="space-y-4 border-l border-[var(--line)] pl-5">
                {article.timeline.map((ev) => (
                  <li key={`${ev.date}-${ev.event}`} className="relative">
                    <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
                    <p className="font-[family-name:var(--font-mono)] text-xs text-[var(--faint)]">{ev.date}</p>
                    <p className="mt-1 text-sm text-white">{ev.event}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {related.length ? (
            <section className="mt-12">
              <p className="ayeba-kicker mb-4">Voir aussi</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {related.map((r) => (
                  <Link key={r.slug} href={`/ayebi/${r.slug}`} className="ayeba-panel block p-4 hover:border-[var(--line-bright)]">
                    <p className="text-sm font-medium text-white">{r.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{r.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Link
                key={tag}
                href={`/?q=${encodeURIComponent(tag)}`}
                className="ayeba-ghost rounded-full px-3 py-1.5 text-xs"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="ayeba-panel overflow-hidden">
            <div className="border-b border-[var(--line)] bg-gradient-to-r from-[rgba(0,180,255,0.12)] to-transparent px-5 py-4">
              <p className="ayeba-kicker ayeba-kicker-accent">Infobox · Ayebi</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-white">{article.title}</p>
            </div>
            <dl className="divide-y divide-[var(--line)]">
              {article.facts.map((f) => (
                <div key={f.label} className="grid grid-cols-[1fr_1.2fr] gap-3 px-5 py-3 text-sm">
                  <dt className="text-[var(--faint)]">{f.label}</dt>
                  <dd className="text-right text-white">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link
            href={`/?q=${encodeURIComponent(article.title)}`}
            className="ayeba-pill mt-4 block w-full py-3 text-center text-sm"
          >
            Rechercher sur AYEBA
          </Link>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--faint)]">
            Encyclopédie libre · 100&nbsp;% RDC · contributions bienvenues
          </p>
        </aside>
      </div>
    </article>
  );
}
