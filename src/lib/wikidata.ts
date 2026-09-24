import { meaningfulTokens, normalizeQueryText, tokenMatchesInHay } from "./search-relevance";

/**
 * Couche connaissance structurée — Wikidata, le graphe derrière Wikipédia.
 * C'est l'équivalent libre et réel du Knowledge Graph de Google : entités Q
 * + propriétés (P35 président, P159 siège, P131 localisation, P569 naissance…).
 * Aucune clé, aucune donnée inventée — chaque réponse vient d'une revendication réelle.
 */

const UA = { "User-Agent": "Ayeba/1.0 (https://ayeba.app; knowledge answers)" };
const MS = 2400;

export type WikiEntity = { id: string; label: string; description?: string };

type SnakValue =
  | { entityType?: string; numericId?: number; id?: string }
  | { time?: string; precision?: number }
  | { amount?: string; unit?: string }
  | { text?: string; language?: string }
  | string;

type Snak = {
  mainsnak?: { snaktype?: string; datavalue?: { value: SnakValue; type: string } };
  rank?: string;
};

export type Claims = Record<string, Snak[]>;

/**
 * Recherche d'entité — gère sigles, translittérations et fautes légères.
 * `preferDesc` affine la désambiguïsation : « poutine » (personne) préfère le
 * candidat décrit « homme d'État » au plat québécois du même nom.
 */
export async function searchEntity(
  subject: string,
  preferDesc?: RegExp,
): Promise<WikiEntity | undefined> {
  for (const lang of ["fr", "en"] as const) {
    try {
      const res = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(subject)}&language=${lang}&uselang=${lang}&format=json&limit=6&type=item`,
        { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        search?: { id: string; label?: string; description?: string }[];
      };
      const cands = data.search ?? [];
      const tokens = meaningfulTokens(subject);
      const subjectMatch = (c: { label?: string; description?: string }) => {
        const hay = normalizeQueryText(`${c.label ?? ""} ${c.description ?? ""}`);
        return tokens.length === 0 || tokens.some((t) => tokenMatchesInHay(t, hay));
      };
      const picked =
        (preferDesc
          ? cands.find(
              (c) =>
                subjectMatch(c) && preferDesc.test(`${c.label ?? ""} ${c.description ?? ""}`),
            )
          : undefined) ??
        cands.find(subjectMatch) ??
        cands[0];
      if (picked) {
        return { id: picked.id, label: picked.label ?? subject, description: picked.description };
      }
    } catch {
      /* langue suivante */
    }
  }
  return undefined;
}

export async function getClaims(id: string): Promise<Claims | undefined> {
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=claims&format=json`,
      { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      entities?: Record<string, { claims?: Claims }>;
    };
    return data.entities?.[id]?.claims;
  } catch {
    return undefined;
  }
}

/** Résout les libellés de plusieurs entités en un seul appel (fr, repli en). */
async function resolveLabels(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids)].slice(0, 40);
  if (!unique.length) return out;
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${unique.join("|")}&props=labels&languages=fr|en&format=json`,
      { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 86400 } },
    );
    if (!res.ok) return out;
    const data = (await res.json()) as {
      entities?: Record<
        string,
        { labels?: Record<string, { value: string }> }
      >;
    };
    for (const [id, e] of Object.entries(data.entities ?? {})) {
      const label = e.labels?.fr?.value ?? e.labels?.en?.value;
      if (label) out.set(id, label);
    }
  } catch {
    /* labels best-effort */
  }
  return out;
}

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « +1952-10-07T00:00:00Z » → « 7 octobre 1952 » (précision jour/mois/année). */
function formatTime(time: string, precision = 11): string {
  const m = time.match(/^\+?(-?\d+)-(\d{2})-(\d{2})T/);
  if (!m) return time.replace(/^\+/, "").replace(/T.*$/, "");
  const year = m[1];
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (precision <= 9 || month === 0) return year;
  const monthName = MONTHS_FR[month - 1] ?? m[2];
  if (precision <= 10 || day === 0) return `${monthName} ${year}`;
  return `${day} ${monthName} ${year}`;
}

function pickSnak(claims: Snak[] | undefined): Snak | undefined {
  if (!claims?.length) return undefined;
  return (
    claims.find((c) => c.rank === "preferred") ??
    // le dernier est souvent le plus récent (population, mandats…)
    claims[claims.length - 1]
  );
}

function allSnaks(claims: Snak[] | undefined, max = 3): Snak[] {
  if (!claims?.length) return [];
  const preferred = claims.filter((c) => c.rank === "preferred");
  const normal = claims.filter((c) => c.rank !== "deprecated");
  return (preferred.length ? preferred : normal).slice(0, max);
}

const UNIT_SHORT: Record<string, string> = {
  Q712226: "km²",
  Q25343: "m²",
  Q35852: "ha",
  Q11573: "m",
  Q174728: "cm",
  Q218593: "mi²",
  Q11942260: "FC",
  Q4917: "USD",
  Q4916: "EUR",
};

/**
 * Valeurs d'une propriété — entités résolues en libellés, dates et quantités
 * formatées. `opts.age` transforme une date de naissance en âge courant.
 */
export async function claimValues(
  claims: Claims,
  props: string[],
  opts?: { age?: boolean; max?: number },
): Promise<string[] | undefined> {
  const entityIds: string[] = [];
  const unitIds: string[] = [];

  for (const p of props) {
    for (const snak of allSnaks(claims[p], opts?.max ?? 3)) {
      const v = snak.mainsnak?.datavalue?.value;
      if (v && typeof v === "object") {
        if ("id" in v && typeof v.id === "string") entityIds.push(v.id);
        if ("numericId" in v && typeof v.numericId === "number") entityIds.push(`Q${v.numericId}`);
        if ("unit" in v && typeof v.unit === "string") {
          const m = v.unit.match(/Q\d+$/);
          if (m && !UNIT_SHORT[m[0]]) unitIds.push(m[0]);
        }
      }
    }
  }

  const labels = await resolveLabels([...entityIds, ...unitIds]);

  for (const p of props) {
    const snaks = allSnaks(claims[p], opts?.max ?? 3);
    if (!snaks.length) continue;
    const out: string[] = [];
    for (const snak of snaks) {
      const dv = snak.mainsnak?.datavalue;
      if (!dv) continue;
      const v = dv.value;
      if (typeof v === "string") {
        out.push(v);
      } else if (v && typeof v === "object") {
        if ("id" in v && typeof v.id === "string") {
          out.push(labels.get(v.id) ?? v.id);
        } else if ("numericId" in v && typeof v.numericId === "number") {
          out.push(labels.get(`Q${v.numericId}`) ?? `Q${v.numericId}`);
        } else if ("time" in v && typeof v.time === "string") {
          if (opts?.age) {
            const birth = new Date(v.time.replace(/^\+/, ""));
            if (!Number.isNaN(birth.getTime())) {
              const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
              out.push(`${age} ans (né(e) le ${formatTime(v.time, v.precision)})`);
            }
          } else {
            out.push(formatTime(v.time, v.precision));
          }
        } else if ("amount" in v && typeof v.amount === "string") {
          const n = Number(v.amount);
          if (!Number.isFinite(n)) continue;
          const unitId = typeof v.unit === "string" ? (v.unit.match(/Q\d+$/)?.[0] ?? "") : "";
          const unit = UNIT_SHORT[unitId] ?? (unitId ? labels.get(unitId) ?? "" : "");
          const formatted = Math.abs(n) >= 1000
            ? Math.round(n).toLocaleString("fr-FR")
            : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
          out.push(unit ? `${formatted} ${unit}` : formatted);
        } else if ("text" in v && typeof v.text === "string") {
          out.push(v.text);
        }
      }
    }
    if (out.length) return [...new Set(out)];
  }
  return undefined;
}

/** Une seule valeur pratique (meilleur rang). */
export async function claimValue(claims: Claims, props: string[]): Promise<string | undefined> {
  const vs = await claimValues(claims, props, { max: 1 });
  return vs?.[0];
}

/** Âge courant depuis P569 — calcul réel, pas un texte figé. */
export async function ageValue(claims: Claims): Promise<string | undefined> {
  const vs = await claimValues(claims, ["P569"], { age: true, max: 1 });
  return vs?.[0];
}

export const entityUrl = (id: string) => `https://www.wikidata.org/wiki/${id}`;
