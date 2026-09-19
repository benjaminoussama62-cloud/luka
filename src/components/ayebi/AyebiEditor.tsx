"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AYEBI_CATEGORIES, slugifyTitle } from "@/lib/ayebi/constants";
import { EDITOR_HELP, renderAyebiMarkup } from "@/lib/ayebi/wiki-markup";
import type { AyebiArticle, AyebiCategory, AyebiQuality, AyebiSection } from "@/lib/ayebi/types";

function parseSections(raw: string): AyebiSection[] {
  return raw
    .split(/\n---+\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      const heading = lines[0].trim();
      const rest = lines.slice(1).join("\n");
      // Sous-sections séparées par ===
      const subBlocks = rest.split(/\n===\n/);
      const mainParagraphs = subBlocks[0].split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
      const subsections = subBlocks.slice(1).map((sb) => {
        const [sh, ...sp] = sb.split("\n");
        return { heading: sh.trim(), paragraphs: sp.join("\n").split(/\n\n+/).map((p) => p.trim()).filter(Boolean) };
      }).filter((s) => s.heading && s.paragraphs.length);
      return { heading, paragraphs: mainParagraphs, subsections: subsections.length ? subsections : undefined };
    })
    .filter((s) => s.heading && s.paragraphs.length);
}

function sectionsToText(sections?: AyebiSection[]): string {
  if (!sections?.length) return "";
  return sections.map((s) => {
    let text = `${s.heading}\n${s.paragraphs.join("\n\n")}`;
    if (s.subsections?.length) {
      text += "\n===\n" + s.subsections.map((sub) => `${sub.heading}\n${sub.paragraphs.join("\n\n")}`).join("\n===\n");
    }
    return text;
  }).join("\n---\n");
}

function parseFacts(raw: string): { label: string; value: string }[] {
  return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const i = line.indexOf("|");
    if (i === -1) return { label: line, value: "—" };
    return { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
  });
}

function factsToText(facts: { label: string; value: string }[]): string {
  return facts.map((f) => `${f.label}|${f.value}`).join("\n");
}

const QUALITIES: { id: AyebiQuality; label: string }[] = [
  { id: "ébauche", label: "✏️ Ébauche" },
  { id: "standard", label: "Article standard" },
  { id: "bon article", label: "✦ Bon article" },
  { id: "article de qualité", label: "★ Article de qualité" },
];

export function AyebiEditor({ initial, mode }: { initial?: Partial<AyebiArticle>; mode: "create" | "edit" }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [category, setCategory] = useState<AyebiCategory>(initial?.category ?? "lieu");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [sectionsText, setSectionsText] = useState(sectionsToText(initial?.sections));
  const [factsText, setFactsText] = useState(factsToText(initial?.facts ?? [{ label: "Pays", value: "RDC" }]));
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [editSummary, setEditSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [imageUrl, setImageUrl] = useState(initial?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [quality, setQuality] = useState<AyebiQuality>(initial?.quality ?? "standard");
  const [portalId, setPortalId] = useState(initial?.portalId ?? "");
  const [navboxText, setNavboxText] = useState((initial?.navboxSlugs ?? []).join(", "));
  const [coordLat, setCoordLat] = useState(initial?.coordinates?.lat?.toString() ?? "");
  const [coordLon, setCoordLon] = useState(initial?.coordinates?.lon?.toString() ?? "");
  const [galleryText, setGalleryText] = useState(
    (initial?.gallery ?? []).map((g) => `${g.url}|${g.caption}${g.credit ? "|" + g.credit : ""}`).join("\n")
  );
  const sectionsRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkup(before: string, after = "") {
    const el = sectionsRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = sectionsText.slice(start, end);
    const next = sectionsText.slice(0, start) + before + selected + after + sectionsText.slice(end);
    setSectionsText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  async function onUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("slug", slug || slugifyTitle(title));
    const res = await fetch("/api/ayebi/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (data.url) setImageUrl(data.url);
    else setError(data.error ?? "Échec du téléversement.");
  }

  function onTitleChange(v: string) {
    setTitle(v);
    if (mode === "create" && !slug) setSlug(slugifyTitle(v));
  }

  function parseGallery(raw: string) {
    return raw.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
      const parts = line.split("|");
      return { url: parts[0]?.trim() ?? "", caption: parts[1]?.trim() ?? "", credit: parts[2]?.trim() };
    }).filter((g) => g.url);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const lat = parseFloat(coordLat);
    const lon = parseFloat(coordLon);

    const article = {
      slug: slug.trim() || slugifyTitle(title),
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      summary: summary.trim(),
      body: [],
      sections: parseSections(sectionsText),
      facts: parseFacts(factsText),
      tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      image: imageUrl || undefined,
      quality,
      stub: quality === "ébauche",
      portalId: portalId.trim() || undefined,
      navboxSlugs: navboxText.split(",").map((s) => s.trim()).filter(Boolean),
      coordinates: !isNaN(lat) && !isNaN(lon) && coordLat && coordLon ? { lat, lon } : undefined,
      gallery: parseGallery(galleryText),
    };

    const url = mode === "create" ? "/api/ayebi/articles" : `/api/ayebi/articles/${initial?.slug}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...article, editSummary }),
    });

    const data = (await res.json()) as { error?: string; article?: { slug: string } };
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Erreur de sauvegarde."); return; }
    router.push(`/ayebi/${data.article?.slug ?? article.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">

      {/* ── Identité ── */}
      <div className="ayeba-panel p-6">
        <p className="ayeba-kicker ayeba-kicker-accent mb-4">
          {mode === "create" ? "Nouvelle fiche · 100 % RDC" : "Modifier la fiche"}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--faint)]">Titre *</span>
            <input value={title} onChange={(e) => onTitleChange(e.target.value)} required className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Identifiant (URL)</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={mode === "edit"} placeholder="ex: patrice-lumumba" className="ayeba-glass w-full rounded-xl px-4 py-3 font-mono text-sm text-white disabled:opacity-50" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Catégorie</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as AyebiCategory)} className="ayeba-glass w-full rounded-xl px-4 py-3 text-white">
              {AYEBI_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--faint)]">Sous-titre</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-[var(--faint)]">Résumé introductif *</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} required rows={3} className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Qualité de l&apos;article</span>
            <select value={quality} onChange={(e) => setQuality(e.target.value as AyebiQuality)} className="ayeba-glass w-full rounded-xl px-4 py-3 text-white">
              {QUALITIES.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="ayeba-panel p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="ayeba-kicker">Corps de l&apos;article</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("edit")} className={`ayeba-ghost px-3 py-1 text-xs ${tab === "edit" ? "border-[var(--accent)]" : ""}`}>Édition</button>
            <button type="button" onClick={() => setTab("preview")} className={`ayeba-ghost px-3 py-1 text-xs ${tab === "preview" ? "border-[var(--accent)]" : ""}`}>Aperçu</button>
          </div>
        </div>
        <p className="mb-2 text-xs text-[var(--muted)]">
          {EDITOR_HELP} · sections séparées par <code className="text-[var(--accent)]">---</code> · sous-sections par <code className="text-[var(--accent)]">===</code>
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => insertMarkup("**", "**")} className="ayeba-ghost px-2 py-1 text-xs">Gras</button>
          <button type="button" onClick={() => insertMarkup("//", "//")} className="ayeba-ghost px-2 py-1 text-xs">Italique</button>
          <button type="button" onClick={() => insertMarkup("[[", "]]")} className="ayeba-ghost px-2 py-1 text-xs">Lien interne</button>
          <button type="button" onClick={() => insertMarkup("[ref:https://|", "]")} className="ayeba-ghost px-2 py-1 text-xs">Référence</button>
          <button type="button" onClick={() => insertMarkup("\n===\nSous-section\n", "")} className="ayeba-ghost px-2 py-1 text-xs">Sous-section</button>
        </div>
        {tab === "edit" ? (
          <textarea
            ref={sectionsRef}
            value={sectionsText}
            onChange={(e) => setSectionsText(e.target.value)}
            rows={18}
            placeholder={`Histoire\nPremier paragraphe avec **gras** et [[kinshasa|Kinshasa]]...\n===\nOrigines\nSous-section...\n---\nGéographie\n...`}
            className="ayeba-glass w-full rounded-xl px-4 py-3 font-mono text-sm leading-relaxed text-white"
          />
        ) : (
          <div className="ayeba-glass rounded-xl px-4 py-4 text-sm leading-relaxed text-[var(--muted)]">
            {parseSections(sectionsText).map((sec) => (
              <section key={sec.heading} className="mb-6">
                <h3 className="text-lg font-semibold text-white">{sec.heading}</h3>
                {sec.paragraphs.map((p, i) => (
                  <p key={i} className="mt-2" dangerouslySetInnerHTML={{ __html: renderAyebiMarkup(p) }} />
                ))}
                {(sec.subsections ?? []).map((sub) => (
                  <div key={sub.heading} className="mt-4 pl-4 border-l border-[var(--line)]">
                    <h4 className="text-base font-semibold text-white">{sub.heading}</h4>
                    {sub.paragraphs.map((p, i) => (
                      <p key={i} className="mt-2" dangerouslySetInnerHTML={{ __html: renderAyebiMarkup(p) }} />
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── Infobox + médias ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ayeba-panel p-6">
          <p className="ayeba-kicker mb-2">Infobox (faits clés)</p>
          <p className="mb-3 text-xs text-[var(--muted)]">Une ligne par fait : Label|Valeur</p>
          <textarea value={factsText} onChange={(e) => setFactsText(e.target.value)} rows={8} className="ayeba-glass w-full rounded-xl px-4 py-3 font-mono text-sm text-white" />
        </div>

        <div className="ayeba-panel p-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Image principale (URL ou upload)</span>
            <div className="flex flex-wrap gap-2">
              <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/uploads/ayebi/…" className="ayeba-glass min-w-0 flex-1 rounded-xl px-4 py-3 text-white" />
              <label className="ayeba-ghost cursor-pointer px-4 py-3 text-xs">
                {uploading ? "…" : "Téléverser"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
              </label>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-[var(--faint)]">Galerie (une image par ligne : url|légende|crédit)</span>
            <textarea value={galleryText} onChange={(e) => setGalleryText(e.target.value)} rows={4} placeholder="https://…/photo.jpg|Légende|© Auteur" className="ayeba-glass w-full rounded-xl px-4 py-3 font-mono text-xs text-white" />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Latitude</span>
              <input value={coordLat} onChange={(e) => setCoordLat(e.target.value)} placeholder="-4.3217" className="ayeba-glass w-full rounded-xl px-3 py-2 font-mono text-sm text-white" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Longitude</span>
              <input value={coordLon} onChange={(e) => setCoordLon(e.target.value)} placeholder="15.3222" className="ayeba-glass w-full rounded-xl px-3 py-2 font-mono text-sm text-white" />
            </label>
          </div>
        </div>
      </div>

      {/* ── Métadonnées ── */}
      <div className="ayeba-panel p-6 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--faint)]">Tags (virgules)</span>
          <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--faint)]">Portail (ID)</span>
          <input value={portalId} onChange={(e) => setPortalId(e.target.value)} placeholder="ex: kinshasa" className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-[var(--faint)]">Boîte de navigation (slugs séparés par virgules)</span>
          <input value={navboxText} onChange={(e) => setNavboxText(e.target.value)} placeholder="patrice-lumumba, mobutu, kabila" className="ayeba-glass w-full rounded-xl px-4 py-3 font-mono text-sm text-white" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs text-[var(--faint)]">Résumé de modification *</span>
          <input value={editSummary} onChange={(e) => setEditSummary(e.target.value)} required placeholder="Ex: Ajout section histoire, correction dates..." className="ayeba-glass w-full rounded-xl px-4 py-3 text-white" />
        </label>
      </div>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="ayeba-pill px-6 py-3 text-sm">
          {saving ? "Publication…" : mode === "create" ? "Publier la fiche" : "Enregistrer"}
        </button>
        <Link href="/ayebi" className="ayeba-ghost px-5 py-3 text-sm">Annuler</Link>
      </div>
    </form>
  );
}
