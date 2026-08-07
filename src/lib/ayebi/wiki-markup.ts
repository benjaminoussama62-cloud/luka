/** Rendu markup Ayebi : [[lien]], **gras**, [ref:url|Titre] */
export function renderAyebiMarkup(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, slug, label) =>
      `<a href="/ayebi/${slug.trim().replace(/\s+/g, "-").toLowerCase()}" class="ayeba-wikilink">${label || slug}</a>`,
  );
  out = out.replace(
    /\[ref:([^\]|]+)(?:\|([^\]]+))?\]/g,
    (_, url, title) =>
      `<a href="${escapeAttr(url)}" target="_blank" rel="noopener" class="ayeba-cite">[${title || "source"}]</a>`,
  );
  return out;
}

export function stripMarkup(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, s, l) => l || s)
    .replace(/\[ref:[^\]]+\]/g, "");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}

export const EDITOR_HELP = `**gras** · [[patrice-lumumba|Lumumba]] · [ref:https://bcc.cd|BCC]`;
