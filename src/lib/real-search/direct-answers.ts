/**
 * Réponses directes calculées — l'équivalent des instant answers de Google
 * pour les demandes vérifiables dans le graphe Wikidata :
 *
 *   « combien de km entre Minsk et Paris » → géocodage + orthodromie (km)
 *   « cite-moi 3 villes chinoises »        → top-N SPARQL par population
 *   « le lion est-il un reptile »          → ASK transitif P171/P31/P279
 *
 * Chaque valeur vient d'une donnée réelle — jamais de texte fabriqué.
 */
import { searchEntity, getClaims, entityUrl } from "../wikidata";
import type { InstantAnswer } from "../types";
import type { QuestionAnswerBundle } from "../question-answer";

const UA = { "User-Agent": "Ayeba/1.0 (https://ayeba.app; direct answers)" };
const SPARQL_MS = 2800;

/** Descriptions Wikidata attendues pour une entité politique (filtre P17). */
const POLITICAL_GEO =
  /pays|état|state|country|nation|république|territoire|province|région|region|commune|ville|city|souverain|empire|royaume|continent/i;

/** Descriptions Wikidata attendues pour un lieu géocodable. */
const PLACE_DESC =
  /pays|état|state|country|nation|république|ville|city|capital|capitale|commune|village|town|municipality|municipalit|région|region|province|territoire|île|island|metropol|district|département|departement|souverain/i;

type GeoPoint = { id: string; label: string; lat: number; lon: number };

async function geocode(name: string): Promise<GeoPoint | undefined> {
  // requireProp=P625 : jamais un homonyme sans coordonnées (« Lubumbashi »
  // groupe de jazz ≠ la ville) — sinon la distance calculée est fausse.
  const e = await searchEntity(name, PLACE_DESC, "P625");
  if (!e) return undefined;
  const claims = await getClaims(e.id);
  const v = claims?.P625?.[0]?.mainsnak?.datavalue?.value as
    | { latitude?: number; longitude?: number }
    | undefined;
  if (typeof v?.latitude !== "number" || typeof v.longitude !== "number") return undefined;
  return { id: e.id, label: e.label, lat: v.latitude, lon: v.longitude };
}

/** Distance orthodromique (vol d'oiseau) en km. */
export function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fmtKm = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ")} km`;

export async function answerDistance(
  from: string,
  to: string,
): Promise<QuestionAnswerBundle | undefined> {
  const [a, b] = await Promise.all([geocode(from), geocode(to)]);
  if (!a || !b) return undefined;
  const km = haversineKm(a, b);
  const instant: InstantAnswer = {
    kind: "distance",
    title: `Distance ${a.label} ↔ ${b.label}`,
    lines: [
      { label: "À vol d'oiseau", value: `≈ ${fmtKm(km)}` },
      { label: "De → vers", value: `${a.label} → ${b.label}` },
    ],
    footnote: "Coordonnées Wikidata — orthodromique (à vol d'oiseau), hors routes",
  };
  return {
    instant,
    panel: {
      title: `${a.label} — ${b.label}`,
      subtitle: "Distance calculée",
      summary: `${a.label} et ${b.label} sont séparés d'environ ${fmtKm(km)} à vol d'oiseau.`,
      facts: [
        { label: "Distance", value: `≈ ${fmtKm(km)}` },
        { label: "Origine", value: a.label },
        { label: "Destination", value: b.label },
      ],
      sources: [entityUrl(a.id), entityUrl(b.id)],
    },
    snippet: {
      title: `Distance ${a.label} ↔ ${b.label}`,
      text: `≈ ${fmtKm(km)} à vol d'oiseau (coordonnées Wikidata).`,
      url: entityUrl(b.id),
      domain: "wikidata.org",
    },
  };
}

async function sparqlSelect(query: string): Promise<{ itemLabel?: { value?: string } }[] | undefined> {
  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(SPARQL_MS), headers: UA, next: { revalidate: 3600 } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      results?: { bindings?: { itemLabel?: { value?: string } }[] };
    };
    return data.results?.bindings;
  } catch {
    return undefined;
  }
}

async function sparqlAsk(query: string): Promise<boolean | undefined> {
  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(SPARQL_MS), headers: UA, next: { revalidate: 3600 } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { boolean?: boolean };
    return data.boolean;
  } catch {
    return undefined;
  }
}

export async function answerList(
  count: number,
  classQid: string,
  classLabel: string,
  country?: string,
): Promise<QuestionAnswerBundle | undefined> {
  let countryQid = "";
  let countryLabel = "";
  if (country) {
    const ce = await searchEntity(country, POLITICAL_GEO);
    if (ce) {
      countryQid = ce.id;
      countryLabel = ce.label;
    }
  }
  // P279? (0-1 saut) : attrape les sous-classes directes (« municipalité de
  // la RPC » → ville). PAS de GROUP BY/MAX ni de chemin transitif — WDQS
  // fait StackOverflowError sinon. Dédup côté client.
  const query = `SELECT DISTINCT ?item ?itemLabel ?pop
WHERE {
  ?item wdt:P31/wdt:P279? wd:${classQid} .
  ${countryQid ? `?item wdt:P17 wd:${countryQid} .` : ""}
  OPTIONAL { ?item wdt:P1082 ?pop . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
ORDER BY DESC(?pop)
LIMIT ${Math.min(Math.max(count, 3), 10) * 4}`;
  const rows = await sparqlSelect(query);
  const names: string[] = [];
  const seen = new Set<string>();
  for (const r of rows ?? []) {
    const v = r.itemLabel?.value?.trim() ?? "";
    if (!v || /^Q\d+$/.test(v) || seen.has(v)) continue;
    seen.add(v);
    names.push(v);
    if (names.length >= Math.max(count, 3)) break;
  }
  if (names.length < 2) return undefined;

  const scope = countryLabel ? ` (${countryLabel})` : "";
  const instant: InstantAnswer = {
    kind: "list",
    title: `${classLabel.charAt(0).toUpperCase()}${classLabel.slice(1)}s${scope}`,
    lines: names.slice(0, count).map((v, i) => ({ label: `${i + 1}`, value: v })),
    footnote: `Wikidata · classé par population quand disponible`,
  };
  return {
    instant,
    panel: {
      title: `${classLabel.charAt(0).toUpperCase()}${classLabel.slice(1)}s${scope}`,
      subtitle: `Top ${names.length} — Wikidata`,
      summary: names.join(" · "),
      facts: names.slice(0, 6).map((v, i) => ({ label: `#${i + 1}`, value: v })),
      sources: ["wikidata.org"],
    },
    snippet: {
      title: `${classLabel.charAt(0).toUpperCase()}${classLabel.slice(1)}s${scope}`,
      text: names.slice(0, count).join(", "),
      url: "https://www.wikidata.org",
      domain: "wikidata.org",
    },
  };
}

/** Une « classe » revendiquée (reptile, mammifère, planète, métal…) — les
 *  homonymes film/album/chanson ne peuvent pas porter un verdict Oui/Non. */
const CLASS_DESC =
  /classe|taxon|groupe|catégorie|embranchement|règne|ordre|famille|genre|espèce|class|taxon|group|phylum|kingdom|order|family|genus|species|category|matériau|material|instrument|sport|science|religion|langue|language|profession|métier|occupation|couleur|color|forme|maladie|disease|élément|element|métal|metal|monnaie|currency|partie du corps|organe|organ|pays|country|planète|planet|concept|notion|discipline/i;

export async function answerMembership(
  subject: string,
  claim: string,
): Promise<QuestionAnswerBundle | undefined> {
  const [subj, cls] = await Promise.all([
    searchEntity(subject),
    searchEntity(claim, CLASS_DESC),
  ]);
  if (!subj || !cls) return undefined;
  const ok = await sparqlAsk(
    `ASK { wd:${subj.id} (wdt:P171|wdt:P31|wdt:P279)* wd:${cls.id} }`,
  );
  if (ok === undefined) return undefined;
  const desc = subj.description?.trim();
  const verdict = ok ? "Oui" : "Non";
  const detail = ok
    ? `${subj.label} est bien classé « ${cls.label} » dans le graphe Wikidata.`
    : `${subj.label} n'est pas un ${cls.label} — ${desc ?? "sa classification diffère"}.`;
  const instant: InstantAnswer = {
    kind: "answer",
    title: `${subj.label} — ${cls.label} ?`,
    lines: [
      { label: "Réponse", value: verdict },
      { label: "En fait", value: desc || subj.label },
    ],
    footnote: `Wikidata ${subj.id} → ${cls.id} · classification transitive`,
  };
  return {
    instant,
    panel: {
      title: subj.label,
      subtitle: `Question de classification — ${verdict}`,
      summary: detail,
      facts: [
        { label: "Réponse", value: verdict },
        { label: "Classe demandée", value: cls.label },
      ],
      sources: [entityUrl(subj.id)],
      image: undefined,
    },
    snippet: {
      title: `${verdict} — ${subj.label}`,
      text: detail,
      url: entityUrl(subj.id),
      domain: "wikidata.org",
    },
  };
}
