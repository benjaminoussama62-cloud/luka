import type { AyebiReference, AyebiSection, AyebiSubSection } from "./types";

export type TOCEntry = {
  id: string;
  heading: string;
  level: 2 | 3;
  num: string;
};

/** Génère la table des matières hiérarchique (1, 1.1, 1.2, 2…) */
export function buildTOC(sections: AyebiSection[]): TOCEntry[] {
  const entries: TOCEntry[] = [];
  sections.forEach((sec, si) => {
    const secNum = String(si + 1);
    entries.push({ id: slugifyHeading(sec.heading), heading: sec.heading, level: 2, num: secNum });
    (sec.subsections ?? []).forEach((sub, ssi) => {
      entries.push({
        id: slugifyHeading(sub.heading),
        heading: sub.heading,
        level: 3,
        num: `${secNum}.${ssi + 1}`,
      });
    });
  });
  return entries;
}

/** Extrait toutes les références inline [ref:url|Titre] de toutes les sections */
export function extractReferences(sections: AyebiSection[]): AyebiReference[] {
  const refs: AyebiReference[] = [];
  let counter = 1;
  const pattern = /\[ref:([^\]|]+)(?:\|([^\]]+))?\]/g;
  const allParagraphs: string[] = [];
  for (const sec of sections) {
    allParagraphs.push(...sec.paragraphs);
    for (const sub of sec.subsections ?? []) {
      allParagraphs.push(...sub.paragraphs);
    }
  }
  for (const p of allParagraphs) {
    let m;
    const re = new RegExp(pattern.source, "g");
    while ((m = re.exec(p)) !== null) {
      const url = m[1];
      const title = m[2] || m[1];
      if (!refs.find((r) => r.url === url)) {
        refs.push({ id: counter++, url, title });
      }
    }
  }
  return refs;
}

/** Rendu markup Ayebi complet */
export function renderAyebiMarkup(text: string, refs?: AyebiReference[]): string {
  let out = escapeHtml(text);

  // Gras
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italique
  out = out.replace(/\/\/(.+?)\/\//g, "<em>$1</em>");

  // Liens internes [[slug|label]]
  out = out.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, slug, label) =>
      `<a href="/ayebi/${slug.trim().replace(/\s+/g, "-").toLowerCase()}" class="ayeba-wikilink">${label || slug}</a>`,
  );

  // Citations [ref:url|Titre] → numéro cliquable
  if (refs?.length) {
    out = out.replace(/\[ref:([^\]|]+)(?:\|([^\]]+))?\]/g, (_, url, title) => {
      const ref = refs.find((r) => r.url === url);
      if (!ref) return "";
      return `<sup><a href="#ref-${ref.id}" id="cite-ref-${ref.id}" class="ayeba-cite-num">[${ref.id}]</a></sup>`;
    });
  } else {
    out = out.replace(/\[ref:[^\]]+\]/g, "");
  }

  return out;
}

/** Liens interwiki Wikipedia FR/EN */
export function interwikiLinks(title: string): { fr: string; en: string } {
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  return {
    fr: `https://fr.wikipedia.org/wiki/${encoded}`,
    en: `https://en.wikipedia.org/wiki/${encoded}`,
  };
}

/** URL OpenStreetMap pour coordonnées */
export function osmUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=12`;
}

/** URL Google Maps */
export function gmapsUrl(lat: number, lon: number): string {
  return `https://maps.google.com/?q=${lat},${lon}`;
}

export function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stripMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\/\/(.+?)\/\//g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, s, l) => l || s)
    .replace(/\[ref:[^\]]+\]/g, "")
    .replace(/\[\d+\]/g, "");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const EDITOR_HELP = `**gras** · //italique// · [[patrice-lumumba|Lumumba]] · [ref:https://bcc.cd|BCC]`;
