"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { AyebiTOC } from "@/components/ayebi/AyebiTOC";
import { AyebiWatchButton } from "@/components/ayebi/AyebiWatchButton";
import { AyebiFlagModal } from "@/components/ayebi/AyebiFlagModal";
import { AyebiStatsBar } from "@/components/ayebi/AyebiStatsBar";
import { AyebiProtectionBadge } from "@/components/ayebi/AyebiProtectionBadge";
import { AyebiGallery } from "@/components/ayebi/AyebiGallery";
import { AyebiNavbox } from "@/components/ayebi/AyebiNavbox";
import {
  buildTOC,
  extractReferences,
  interwikiLinks,
  renderAyebiMarkup,
  slugifyHeading,
  osmUrl,
  gmapsUrl,
} from "@/lib/ayebi/wiki-markup";
import type { AyebiArticle } from "@/lib/ayebi/types";
import type { PageProtection } from "@/lib/ayebi/db-sqlite";

const QUALITY_CONFIG = {
  "article de qualité": { label: "★ Article de qualité", color: "rgba(255,215,0,0.9)", bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.35)" },
  "bon article": { label: "✦ Bon article", color: "rgba(100,220,100,0.9)", bg: "rgba(100,220,100,0.08)", border: "rgba(100,220,100,0.35)" },
  "standard": { label: "Article standard", color: "rgba(150,150,150,0.7)", bg: "transparent", border: "rgba(150,150,150,0.2)" },
  "ébauche": { label: "✏️ Ébauche", color: "rgba(255,200,0,0.8)", bg: "rgba(255,200,0,0.06)", border: "rgba(255,200,0,0.35)" },
};

const CAT_SLUG: Record<string, string> = {
  "personnalité": "personnalites",
  "lieu": "lieux",
  "institution": "institutions",
  "économie": "economie",
  "culture": "culture",
  "sport": "sport",
};

export function AyebiArticleView({
  article,
  related,
  backlinks = [],
  canEdit = false,
  isAdmin = false,
  meta,
}: {
  article: AyebiArticle;
  related: AyebiArticle[];
  backlinks?: { slug: string; title: string }[];
  canEdit?: boolean;
  isAdmin?: boolean;
  meta?: {
    revision: number;
    updatedByName: string;
    updatedAt: string;
    protection: PageProtection;
    stub: boolean;
    viewCount: number;
    contributorCount: number;
    createdByName: string;
    createdAt: string;
  } | null;
}) {
  const [flagOpen, setFlagOpen] = useState(false);
  const [protection, setProtection] = useState<PageProtection>(meta?.protection ?? "none");
  const [settingProt, setSettingProt] = useState(false);
  const [readMode, setReadMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const sections = article.sections ?? (article.body.length ? [{ heading: "Article", paragraphs: article.body }] : []);
  const toc = buildTOC(sections);
  const refs = article.references?.length ? article.references : extractReferences(sections);
  const interwiki = interwikiLinks(article.title);
  const quality = article.quality ?? (meta?.stub || article.stub ? "ébauche" : "standard");
  const qualityCfg = QUALITY_CONFIG[quality];
  const gallery = article.gallery ?? [];

  async function changeProtection(p: PageProtection) {
    setSettingProt(true);
    await fetch(`/api/ayebi/articles/${article.slug}/protection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protection: p }),
    });
    setProtection(p);
    setSettingProt(false);
  }

  function copyPermalink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function printPDF() {
    window.print();
  }

  const highlightSearch = useCallback((text: string) => {
    if (!searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${escaped})`, "gi"), '<mark class="ayeba-search-highlight">$1</mark>');
  }, [searchQuery]);

  // Keyboard shortcut: Ctrl+F dans l'article
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && readMode) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readMode]);

  return (
    <article
      ref={articleRef}
      className={`relative z-10 min-h-dvh px-4 py-8 sm:py-12 ${readMode ? "ayeba-read-mode" : ""}`}
    >
      <div className={`mx-auto gap-8 ${readMode ? "max-w-3xl" : "grid max-w-6xl lg:grid-cols-[1fr_300px]"}`}>
        <div className="min-w-0">

          {/* ── Barre d'outils ── */}
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-3">
            <Link href="/ayebi" className="ayeba-ghost px-3 py-1.5 text-xs">← Encyclopédie</Link>
            {canEdit ? (
              <Link href={`/ayebi/${article.slug}/modifier`} className="ayeba-pill px-4 py-1.5 text-xs">✎ Modifier</Link>
            ) : (
              <Link href={`/ayebi/connexion?redirect=/ayebi/${article.slug}/modifier`} className="ayeba-ghost px-3 py-1.5 text-xs">Se connecter pour modifier</Link>
            )}
            <Link href={`/ayebi/${article.slug}/historique`} className="ayeba-ghost px-3 py-1.5 text-xs">Historique</Link>
            <Link href={`/ayebi/${article.slug}/discussion`} className="ayeba-ghost px-3 py-1.5 text-xs">Discussion</Link>
            <AyebiWatchButton slug={article.slug} />
            <button type="button" onClick={() => setReadMode((r) => !r)} className={`ayeba-ghost px-3 py-1.5 text-xs ${readMode ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}>
              {readMode ? "⊠ Normal" : "⊡ Lecture"}
            </button>
            <button type="button" onClick={() => setSearchOpen((s) => !s)} className="ayeba-ghost px-3 py-1.5 text-xs">🔍 Chercher</button>
            <button type="button" onClick={copyPermalink} className="ayeba-ghost px-3 py-1.5 text-xs">{copied ? "✓ Copié" : "🔗 Lien"}</button>
            <button type="button" onClick={printPDF} className="ayeba-ghost px-3 py-1.5 text-xs">↓ PDF</button>
            <button type="button" onClick={() => setFlagOpen(true)} className="ayeba-ghost px-3 py-1.5 text-xs">⚑ Signaler</button>
          </div>

          {/* ── Recherche dans l'article ── */}
          {searchOpen && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.4)] px-4 py-2">
              <span className="text-xs text-[var(--faint)]">Rechercher dans l&apos;article :</span>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="mot-clé…"
                className="flex-1 bg-transparent text-sm text-white outline-none"
              />
              <button type="button" onClick={() => { setSearchQuery(""); setSearchOpen(false); }} className="text-xs text-[var(--faint)] hover:text-white">✕</button>
            </div>
          )}

          {/* ── Bandeau qualité ── */}
          {quality !== "standard" && (
            <div
              className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{ borderColor: qualityCfg.border, background: qualityCfg.bg }}
            >
              <span className="text-sm font-medium" style={{ color: qualityCfg.color }}>{qualityCfg.label}</span>
              {quality === "ébauche" && (
                <span className="text-xs text-[var(--muted)]">
                  Cet article est incomplet. <Link href={`/ayebi/${article.slug}/modifier`} className="text-[var(--accent)] hover:underline">Contribuez à son amélioration.</Link>
                </span>
              )}
            </div>
          )}

          {/* ── Badges protection ── */}
          <div className="mb-3 flex flex-wrap gap-2">
            <AyebiProtectionBadge protection={protection} />
          </div>

          {/* ── En-tête ── */}
          <div className="border-b border-[var(--line)] pb-4">
            <p className="ayeba-kicker ayeba-kicker-accent capitalize">{article.category}</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold text-white sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-2 text-lg text-[var(--muted)]">{article.subtitle}</p>

            {/* Coordonnées géographiques */}
            {article.coordinates && (
              <div className="mt-2 flex flex-wrap gap-3">
                <a
                  href={osmUrl(article.coordinates.lat, article.coordinates.lon)}
                  target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[11px] text-[rgba(0,200,255,0.8)] hover:underline"
                >
                  📍 {article.coordinates.lat.toFixed(4)}°N, {article.coordinates.lon.toFixed(4)}°E
                </a>
                <a
                  href={gmapsUrl(article.coordinates.lat, article.coordinates.lon)}
                  target="_blank" rel="noopener noreferrer"
                  className="font-mono text-[11px] text-[var(--faint)] hover:text-white"
                >
                  Google Maps ↗
                </a>
              </div>
            )}

            {/* Méta révision */}
            {meta && (
              <p className="mt-2 font-mono text-[10px] text-[var(--faint)]">
                Dernière modification :{" "}
                <Link href={`/ayebi/utilisateur/${meta.updatedByName}`} className="hover:underline">{meta.updatedByName}</Link>
                {" · "}rev. {meta.revision}{" · "}{new Date(meta.updatedAt).toLocaleString("fr-FR")}
                {" · "}Créé par{" "}
                <Link href={`/ayebi/utilisateur/${meta.createdByName}`} className="hover:underline">{meta.createdByName}</Link>
              </p>
            )}

            {/* Stats */}
            <AyebiStatsBar slug={article.slug} />
          </div>

          {/* ── Corps principal ── */}
          <div className="mt-6 flex flex-col gap-0 lg:flex-row lg:gap-6">

            {/* Colonne texte */}
            <div className="min-w-0 flex-1">

              {/* Résumé introductif */}
              <div className="ayeba-lead mb-6">{article.summary}</div>

              {/* TOC */}
              {toc.length >= 2 && <AyebiTOC entries={toc} />}

              {/* Sections */}
              {sections.map((sec, si) => (
                <section key={sec.heading} id={slugifyHeading(sec.heading)} className="mt-8">
                  <h2 className="flex items-center gap-2 border-b border-[var(--line)] pb-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                    <span className="font-mono text-sm text-[var(--faint)]">{si + 1}</span>
                    {sec.heading}
                    <a href={`#${slugifyHeading(sec.heading)}`} className="text-[var(--faint)] opacity-0 hover:opacity-100 text-sm" aria-label="Lien ancre">§</a>
                    {canEdit && (
                      <Link
                        href={`/ayebi/${article.slug}/modifier?section=${si}`}
                        className="ml-auto font-[family-name:var(--font-body)] text-xs font-normal text-[rgba(0,200,255,0.75)] hover:underline"
                      >
                        [modifier]
                      </Link>
                    )}
                  </h2>
                  <div className="mt-4 space-y-4 text-[15px] leading-[1.9] text-[var(--muted)]">
                    {sec.paragraphs.map((p, pi) => (
                      <p
                        key={pi}
                        dangerouslySetInnerHTML={{
                          __html: searchQuery
                            ? highlightSearch(renderAyebiMarkup(p, refs))
                            : renderAyebiMarkup(p, refs),
                        }}
                      />
                    ))}
                  </div>

                  {/* Sous-sections h3 */}
                  {(sec.subsections ?? []).map((sub, ssi) => (
                    <section key={sub.heading} id={slugifyHeading(sub.heading)} className="mt-6 pl-4 border-l-2 border-[var(--line)]">
                      <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                        <span className="font-mono text-xs text-[var(--faint)]">{si + 1}.{ssi + 1}</span>
                        {sub.heading}
                        <a href={`#${slugifyHeading(sub.heading)}`} className="ml-auto text-[var(--faint)] opacity-0 hover:opacity-100 text-xs" aria-label="Lien ancre">§</a>
                      </h3>
                      <div className="mt-3 space-y-3 text-[14px] leading-[1.85] text-[var(--muted)]">
                        {sub.paragraphs.map((p, pi) => (
                          <p
                            key={pi}
                            dangerouslySetInnerHTML={{
                              __html: searchQuery
                                ? highlightSearch(renderAyebiMarkup(p, refs))
                                : renderAyebiMarkup(p, refs),
                            }}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </section>
              ))}

              {/* Chronologie */}
              {article.timeline?.length ? (
                <section className="ayeba-panel mt-10 p-6">
                  <h2 className="ayeba-kicker mb-5">Chronologie</h2>
                  <ol className="space-y-4 border-l-2 border-[var(--line)] pl-5">
                    {article.timeline.map((ev) => (
                      <li key={`${ev.date}-${ev.event}`} className="relative">
                        <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] bg-black" />
                        <p className="font-mono text-xs font-semibold text-[var(--accent)]">{ev.date}</p>
                        <p className="mt-1 text-sm text-white">{ev.event}</p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {/* Galerie */}
              {gallery.length > 0 && (
                <section className="mt-10">
                  <h2 className="ayeba-kicker mb-4">Galerie</h2>
                  <AyebiGallery images={gallery} />
                </section>
              )}

              {/* Références */}
              {refs.length > 0 && (
                <section className="mt-10" id="references">
                  <h2 className="flex items-center gap-2 border-b border-[var(--line)] pb-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
                    Références
                  </h2>
                  <ol className="mt-4 columns-1 gap-4 space-y-2 sm:columns-2">
                    {refs.map((ref) => (
                      <li key={ref.id} id={`ref-${ref.id}`} className="flex gap-2 break-inside-avoid text-sm text-[var(--muted)]">
                        <span className="shrink-0 font-mono text-[var(--faint)]">{ref.id}.</span>
                        <span>
                          <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-[rgba(0,200,255,0.85)] hover:underline">
                            {ref.title}
                          </a>
                          {ref.author && <span className="ml-1 text-[var(--faint)]">— {ref.author}</span>}
                          {ref.publisher && <span className="ml-1 text-[var(--faint)]">({ref.publisher})</span>}
                          {ref.date && <span className="ml-1 text-[var(--faint)]">{ref.date}</span>}
                          {" "}
                          <a href={`#cite-ref-${ref.id}`} className="font-mono text-[10px] text-[var(--faint)] hover:text-white">↑</a>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Voir aussi */}
              {related.length > 0 && (
                <section className="mt-10">
                  <h2 className="ayeba-kicker mb-4">Voir aussi</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {related.map((r) => (
                      <Link key={r.slug} href={`/ayebi/${r.slug}`} className="ayeba-panel block p-4 hover:border-[var(--line-bright)]">
                        <p className="text-sm font-semibold text-white">{r.title}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{r.summary}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Boîte de navigation */}
              {article.navboxSlugs?.length ? (
                <AyebiNavbox slugs={article.navboxSlugs} currentSlug={article.slug} category={article.category} />
              ) : null}

              {/* Liens interwiki */}
              <section className="mt-8 border-t border-[var(--line)] pt-6">
                <p className="ayeba-kicker mb-3">Dans d&apos;autres encyclopédies</p>
                <div className="flex flex-wrap gap-2">
                  <a href={interwiki.fr} target="_blank" rel="noopener noreferrer" className="ayeba-ghost px-3 py-1.5 text-xs">
                    🌐 Wikipédia (français)
                  </a>
                  <a href={interwiki.en} target="_blank" rel="noopener noreferrer" className="ayeba-ghost px-3 py-1.5 text-xs">
                    🌐 Wikipedia (English)
                  </a>
                </div>
              </section>

              {/* Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Link key={tag} href={`/ayebi/recherche?q=${encodeURIComponent(tag)}`} className="ayeba-ghost rounded-full px-3 py-1 text-xs">
                    {tag}
                  </Link>
                ))}
              </div>

              {/* Portail */}
              {article.portalId && (
                <div className="mt-4">
                  <Link href={`/ayebi/portail/${article.portalId}`} className="ayeba-ghost px-4 py-2 text-xs">
                    🗂 Portail : {article.portalId}
                  </Link>
                </div>
              )}

              {/* Catégorie */}
              <div className="mt-4 border-t border-[var(--line)] pt-4">
                <span className="text-xs text-[var(--faint)]">Catégorie : </span>
                <Link href={`/ayebi/categorie/${CAT_SLUG[article.category] ?? article.category}`} className="text-xs text-[rgba(0,200,255,0.8)] hover:underline capitalize">
                  {article.category}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar (masquée en mode lecture) ── */}
        {!readMode && (
          <aside className="lg:sticky lg:top-8 lg:self-start space-y-4">

            {/* Infobox avec image intégrée */}
            <div className="ayeba-panel overflow-hidden text-sm">
              {article.image && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={article.image} alt={article.title} className="h-52 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <p className="absolute bottom-2 left-3 right-3 font-[family-name:var(--font-display)] text-base font-semibold text-white drop-shadow">
                    {article.title}
                  </p>
                </div>
              )}
              <div className={article.image ? "" : "border-b border-[var(--line)] bg-gradient-to-r from-[rgba(0,180,255,0.12)] to-transparent px-4 py-3"}>
                {!article.image && (
                  <p className="font-[family-name:var(--font-display)] text-base font-semibold text-white">{article.title}</p>
                )}
                <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[var(--accent)]">Infobox · Ayebi</p>
              </div>
              <dl className="divide-y divide-[var(--line)]">
                {article.facts.map((f) => (
                  <div key={f.label} className="grid grid-cols-[1fr_1.3fr] gap-2 px-4 py-2.5">
                    <dt className="text-[var(--faint)] text-xs">{f.label}</dt>
                    <dd className="text-right text-white text-xs font-medium">{f.value}</dd>
                  </div>
                ))}
                {article.coordinates && (
                  <div className="grid grid-cols-[1fr_1.3fr] gap-2 px-4 py-2.5">
                    <dt className="text-[var(--faint)] text-xs">Coordonnées</dt>
                    <dd className="text-right">
                      <a href={osmUrl(article.coordinates.lat, article.coordinates.lon)} target="_blank" rel="noopener noreferrer" className="text-xs text-[rgba(0,200,255,0.8)] hover:underline">
                        {article.coordinates.lat.toFixed(3)}°, {article.coordinates.lon.toFixed(3)}°
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Actions rapides */}
            <div className="space-y-2">
              <Link href={`/ayebi/recherche?q=${encodeURIComponent(article.title)}`} className="ayeba-pill block w-full py-2.5 text-center text-xs">
                Rechercher sur AYEBA
              </Link>
              <Link href={`/ayebi/categorie/${CAT_SLUG[article.category] ?? article.category}`} className="ayeba-ghost block w-full py-2 text-center text-xs capitalize">
                📂 {article.category}
              </Link>
            </div>

            {/* Pages liées (backlinks) */}
            {backlinks.length > 0 && (
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Pages liées</p>
                <ul className="space-y-1.5">
                  {backlinks.map((b) => (
                    <li key={b.slug}>
                      <Link href={`/ayebi/${b.slug}`} className="text-xs text-[rgba(0,200,255,0.8)] hover:underline">
                        {b.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Admin : protection */}
            {isAdmin && (
              <div className="ayeba-panel p-4">
                <p className="ayeba-kicker mb-3">Protection (admin)</p>
                <div className="flex flex-col gap-2">
                  {(["none", "semi", "full"] as PageProtection[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={settingProt || protection === p}
                      onClick={() => changeProtection(p)}
                      className={`ayeba-ghost px-3 py-1.5 text-xs ${protection === p ? "border-[var(--accent)] text-[var(--accent)]" : ""}`}
                    >
                      {p === "none" ? "🔓 Aucune" : p === "semi" ? "🔒 Semi-protégée" : "🔐 Protégée (admin)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-center text-[10px] leading-relaxed text-[var(--faint)]">
              Encyclopédie libre · 100&nbsp;% RDC<br />Licence CC BY-SA 4.0
            </p>
          </aside>
        )}
      </div>

      {flagOpen && <AyebiFlagModal slug={article.slug} onClose={() => setFlagOpen(false)} />}
    </article>
  );
}
