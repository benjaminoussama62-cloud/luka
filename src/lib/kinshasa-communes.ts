/**
 * Les 24 communes de Kinshasa — pour désambiguïser « Lemba », « Gombe », etc.
 * face aux homonymes européens (Lembach, etc.) quand la requête parle de
 * commune / quartier / identité administrative.
 */

export const KINSHASA_COMMUNES: ReadonlyArray<{
  slug: string;
  title: string;
  wikiTitle: string;
}> = [
  { slug: "banda", title: "Bandalungwa", wikiTitle: "Bandalungwa" },
  { slug: "barumbu", title: "Barumbu", wikiTitle: "Barumbu" },
  { slug: "bumbu", title: "Bumbu", wikiTitle: "Bumbu" },
  { slug: "gombe", title: "Gombe", wikiTitle: "Gombe_(Kinshasa)" },
  { slug: "kalamu", title: "Kalamu", wikiTitle: "Kalamu" },
  { slug: "kasa-vubu", title: "Kasa-Vubu", wikiTitle: "Kasa-Vubu_(commune)" },
  { slug: "kimbanseke", title: "Kimbanseke", wikiTitle: "Kimbanseke" },
  { slug: "kinshasa-commune", title: "Kinshasa (commune)", wikiTitle: "Kinshasa_(commune)" },
  { slug: "kintambo", title: "Kintambo", wikiTitle: "Kintambo" },
  { slug: "kisenso", title: "Kisenso", wikiTitle: "Kisenso" },
  { slug: "lemba", title: "Lemba", wikiTitle: "Lemba_(Kinshasa)" },
  { slug: "limete", title: "Limete", wikiTitle: "Limete" },
  { slug: "lingwala", title: "Lingwala", wikiTitle: "Lingwala" },
  { slug: "makala", title: "Makala", wikiTitle: "Makala" },
  { slug: "maluku", title: "Maluku", wikiTitle: "Maluku_(Kinshasa)" },
  { slug: "masina", title: "Masina", wikiTitle: "Masina_(Kinshasa)" },
  { slug: "matete", title: "Matete", wikiTitle: "Matete" },
  { slug: "mont-ngafula", title: "Mont-Ngafula", wikiTitle: "Mont-Ngafula" },
  { slug: "ndjili", title: "N'djili", wikiTitle: "N%27djili" },
  { slug: "ngaba", title: "Ngaba", wikiTitle: "Ngaba" },
  { slug: "ngaliema", title: "Ngaliema", wikiTitle: "Ngaliema" },
  { slug: "ngiri-ngiri", title: "Ngiri-Ngiri", wikiTitle: "Ngiri-Ngiri" },
  { slug: "nsele", title: "Nsele", wikiTitle: "Nsele" },
  { slug: "selembao", title: "Selembao", wikiTitle: "Selembao" },
];

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['']/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True si la requête pointe clairement hors RDC (France, etc.). */
export function queryPointsOutsideRdc(query: string): boolean {
  return /\b(france|alsace|bas[- ]rhin|strasbourg|paris|belgique|bruxelles|canada|quebec)\b/i.test(
    norm(query),
  );
}

/**
 * Détecte une commune de Kinshasa dans la requête.
 * Priorité forte si « commune / quartier / est un… » sans contexte France.
 */
export function matchKinshasaCommune(query: string): {
  slug: string;
  title: string;
  wikiUrl: string;
  wikiQuery: string;
  snippet: string;
} | null {
  if (queryPointsOutsideRdc(query)) return null;
  const n = norm(query);
  const adminAsk = /\b(commune|quartier|district|arrondissement)\b/.test(n);
  const identityAsk = /\b(est (un|une)|cest|c est|ou q)\b/.test(n);

  for (const c of KINSHASA_COMMUNES) {
    const aliases = [norm(c.title), norm(c.slug), norm(c.slug.replace(/-/g, ""))];
    if (c.slug === "banda") aliases.push("bandalungwa", "banda");
    if (c.slug === "ndjili") aliases.push("ndjili", "n djili");
    const hit = aliases.some(
      (a) => a.length >= 3 && (n === a || n.includes(` ${a} `) || n.startsWith(`${a} `) || n.endsWith(` ${a}`) || n.includes(a)),
    );
    if (!hit) continue;
    // « kinshasa » seul = la ville, pas la commune homonyme.
    if (c.slug === "kinshasa-commune" && !/\bcommune\b/.test(n)) continue;
    const congoHint = /\b(kinshasa|rdc|congo|kinois)\b/.test(n);
    const shortNameQuery = n.split(" ").filter(Boolean).length <= 3;
    if (!(adminAsk || identityAsk || congoHint || shortNameQuery)) continue;
    return {
      slug: c.slug,
      title: c.title,
      wikiUrl: `https://fr.wikipedia.org/wiki/${c.wikiTitle}`,
      wikiQuery: `${c.title} Kinshasa`,
      snippet: `${c.title} est une des 24 communes de la ville-province de Kinshasa, en République démocratique du Congo.`,
    };
  }
  return null;
}
