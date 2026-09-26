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
  requireProp?: string,
  /** Type d'entité ATTENDU par la question (description Wikidata) : une
   *  question sur des provinces exige un pays/territoire — un musée ou un
   *  sujet homonyme (« MALI » = musée de Lima) ne peut plus voler la requête. */
  expectDesc?: RegExp,
  /** Langue native de la requête (« ru ») — « Мали » résout en russe là où
   *  fr|en ne matchent rien. */
  langHint?: string,
): Promise<WikiEntity | undefined> {
  const langs = [
    langHint && /^[a-z]{2,3}$/i.test(langHint) ? langHint.toLowerCase() : undefined,
    "fr",
    "en",
  ].filter((l, i, a): l is string => Boolean(l) && a.indexOf(l) === i);
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(subject)}&language=${lang}&uselang=${lang}&format=json&limit=6&type=item`,
        { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        search?: {
          id: string;
          label?: string;
          description?: string;
          match?: { text?: string; type?: string };
        }[];
      };
      const cands = data.search ?? [];
      const tokens = meaningfulTokens(subject);
      const subjectMatch = (c: { label?: string; description?: string; match?: { text?: string } }) => {
        const hay = normalizeQueryText(`${c.label ?? ""} ${c.description ?? ""} ${c.match?.text ?? ""}`);
        return tokens.length === 0 || tokens.some((t) => tokenMatchesInHay(t, hay));
      };
      const eligible = cands.filter(subjectMatch);
      let pool = eligible.length ? eligible : cands;
      // Exclure les pages d'homonymie (« UDPS » → page d'homonymie sans faits).
      const real = pool.filter((c) => !/homonymie|disambiguation/i.test(c.description ?? ""));
      if (!real.length) continue;
      pool = real;
      // Type attendu : si des candidats correspondent au type demandé
      // (pays pour « provinces », personne pour « épouse »…), écarter les
      // autres. Sinon on garde le pool — mieux un type douteux que rien.
      if (expectDesc) {
        const typed = pool.filter((c) => expectDesc.test(c.description ?? ""));
        if (typed.length) pool = typed;
      }
      const hinted = preferDesc
        ? pool.filter((c) => preferDesc.test(`${c.label ?? ""} ${c.description ?? ""}`))
        : [];
      // Aucun candidat « personne » dans cette langue → essayer la suivante :
      // « poutine » en FR ne retourne que le plat, EN rend Vladimir Putin.
      // Sauf langue NATIVE non-fr/en : les descriptions russes/arabes ne
      // matchent jamais le vocabulaire du filtre — le pool reste valide.
      if (preferDesc && !hinted.length && (lang === "fr" || lang === "en")) continue;
      let shortlist = (hinted.length ? hinted : pool).slice(0, 6);
      // Contrainte sémantique : « où est mort X » exige une entité avec P570
      // (un vivant — footballeur homonyme — n'a pas de lieu de décès).
      // MAIS si le seul vrai match du sujet (libellé/alias) n'a pas la
      // propriété, mieux vaut l'entité exacte sans valeur qu'une entité
      // voisine qui dérive (« maire de kinshasa » → la RDC a un P6, pas la ville).
      if (requireProp && shortlist.length > 1) {
        // Match fort = TOUS les tokens du sujet sont dans le libellé ou dans
        // l'alias correspondant. « Kinshasan Kongo » (alias de la RDC) n'est
        // pas « Kinshasa » — sinon « maire de kinshasa » dérive vers la RDC
        // qui possède un P6 contrairement à la ville.
        const strongMatch = (c: { label?: string; match?: { text?: string; type?: string } }) => {
          const labT = normalizeQueryText(c.label ?? "").split(/\s+/).filter(Boolean);
          const aliasT = normalizeQueryText(c.match?.text ?? "").split(/\s+/).filter(Boolean);
          return (
            (tokens.length > 0 && tokens.every((t) => labT.includes(t))) ||
            (c.match?.type === "alias" && tokens.length > 0 && tokens.every((t) => aliasT.includes(t)))
          );
        };
        const strongAll = shortlist.filter(strongMatch);
        const withProp = await filterByProp(shortlist, requireProp);
        if (withProp.length) {
          const strongProp = withProp.filter(strongMatch);
          // Priorité aux matches forts AVEC la propriété (« dirigeant chinois »
          // → RPC avec P35, pas la « Chine » civilisation). Aucun fort avec la
          // propriété → le plus notable parmi les forts, JAMAIS un voisin.
          shortlist = strongProp.length ? strongProp : strongAll.length ? strongAll : withProp;
        } else if (strongAll.length) {
          // Aucun candidat avec la propriété — ou requête en échec (throttle).
          // Le match exact du sujet reste, JAMAIS un voisin plus notable
          // (« maire de kinshasa » : la RDC a un P6 ET un alias « Congo-
          // Kinshasa », mais elle n'est pas la ville demandée).
          shortlist = strongAll;
        }
      }
      // Libellé exact en priorité seulement sans autre signal (« kinshasa » →
      // la ville). Plusieurs libellés exacts (« Suisse » = pays ET commune de
      // Moselle) → la notoriété départage, comme le Knowledge Graph.
      if (!preferDesc && !requireProp) {
        const sk = normalizeQueryText(subject);
        const exacts = shortlist.filter((c) => normalizeQueryText(c.label ?? "") === sk);
        if (exacts.length) {
          const exact =
            exacts.length === 1 ? exacts[0] : (await mostNotable(exacts)) ?? exacts[0];
          return { id: exact.id, label: exact.label ?? subject, description: exact.description };
        }
      }
      const picked = shortlist.length <= 1 ? shortlist[0] : await mostNotable(shortlist);
      if (picked) {
        return { id: picked.id, label: picked.label ?? subject, description: picked.description };
      }
    } catch {
      /* langue suivante */
    }
  }
  return undefined;
}

/** Ne garde que les candidats possédant la propriété exigée (P570 pour « mort »…). */
/**
 * Recherche une FONCTION (« minister of sports ») liée à un contexte
 * (« Guinea ») — puis le caller lit P1308 (titulaire actuel). La recherche
 * porte le seul nom de la fonction : wbsearchentities exige une phrase
 * quasi exacte (« minister of foreign affairs Russia » ne matche rien).
 * Le contexte filtre les homonymes (« …of Sweden » vs « …of Guinea »).
 */
export async function searchPositionEntity(
  position: string,
  context?: string,
): Promise<WikiEntity | undefined> {
  for (const lang of ["en", "fr"] as const) {
    try {
      const res = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(position)}&language=${lang}&uselang=${lang}&format=json&limit=8&type=item`,
        { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        search?: { id: string; label?: string; description?: string; match?: { text?: string } }[];
      };
      let cands = (data.search ?? []).filter(
        (c) => !/homonymie|disambiguation/i.test(c.description ?? ""),
      );
      if (!cands.length) continue;
      // Le contexte (pays/org) doit apparaître dans le libellé, la
      // description ou l'alias matché — sinon n'importe quel pays gagne.
      if (context) {
        const ctxTokens = meaningfulTokens(context);
        if (ctxTokens.length) {
          const inCtx = cands.filter((c) => {
            const hay = normalizeQueryText(`${c.label ?? ""} ${c.description ?? ""} ${c.match?.text ?? ""}`);
            return ctxTokens.some((t) => tokenMatchesInHay(t, hay));
          });
          if (inCtx.length) cands = inCtx;
          else continue; // contexte absent → langue suivante
        }
      }
      const withProp = await filterByProp(cands, "P1308");
      const first = withProp[0];
      if (first) {
        return { id: first.id, label: first.label ?? first.id, description: first.description };
      }
    } catch {
      /* langue suivante */
    }
  }
  return undefined;
}

async function filterByProp<T extends { id: string }>(cands: T[], prop: string): Promise<T[]> {
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${cands.map((c) => c.id).join("|")}&props=claims&format=json`,
      { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      entities?: Record<string, { claims?: Record<string, unknown[]> }>;
    };
    return cands.filter((c) => (data.entities?.[c.id]?.claims?.[prop] ?? []).length > 0);
  } catch {
    return [];
  }
}

/** Le candidat le plus notable = le plus de sitelinks Wikipédia. */
async function mostNotable<T extends { id: string }>(cands: T[]): Promise<T | undefined> {
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${cands.map((c) => c.id).join("|")}&props=sitelinks&format=json`,
      { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 86400 } },
    );
    if (!res.ok) return cands[0];
    const data = (await res.json()) as {
      entities?: Record<string, { sitelinks?: Record<string, unknown> }>;
    };
    let best: T | undefined;
    let bestCount = -1;
    for (const c of cands) {
      const n = Object.keys(data.entities?.[c.id]?.sitelinks ?? {}).length;
      if (n > bestCount) {
        best = c;
        bestCount = n;
      }
    }
    return best ?? cands[0];
  } catch {
    return cands[0];
  }
}

export async function getClaims(id: string): Promise<Claims | undefined> {
  try {
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=claims&format=json`,
      // Dump complet (~10 Mo pour un pays) — plus long que les petites requêtes.
      { signal: AbortSignal.timeout(3200), headers: UA, next: { revalidate: 3600 } },
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
/**
 * Revendications ciblées par propriété — `wbgetclaims` renvoie de petites
 * réponses là où `wbgetentities&props=claims` télécharge le dump COMPLET
 * (~10 Mo pour un pays) et expire sous la latence réseau. C'est la
 * différence entre une réponse fiable et un timeout intermittent.
 */
export async function getClaimsFor(
  id: string,
  props: string[],
  opts?: { concurrency?: number },
): Promise<Claims | undefined> {
  const out: Claims = {};
  const conc = opts?.concurrency ?? 6;
  // Chunks séquentiels : 40 requêtes simultanées font expirer les dernières
  // en file d'attente socket et déclenchent le rate-limit Wikidata.
  for (let i = 0; i < props.length; i += conc) {
    const chunk = props.slice(i, i + conc);
    await Promise.all(
      chunk.map(async (p) => {
        try {
          const res = await fetch(
            `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${id}&property=${p}&format=json`,
            { signal: AbortSignal.timeout(MS), headers: UA, next: { revalidate: 3600 } },
          );
          if (!res.ok) return;
          const data = (await res.json()) as { claims?: Claims };
          if (data.claims?.[p]) out[p] = data.claims[p];
        } catch {
          /* propriété ignorée */
        }
      }),
    );
  }
  return Object.keys(out).length ? out : undefined;
}

/** Ids d'entités pointées par une propriété (pour les questions à 2 sauts :
 *  « première dame » = P26 du titulaire P35). */
export function claimEntityIds(claims: Claims, props: string[]): string[] {
  const out: string[] = [];
  for (const p of props) {
    for (const snak of allSnaks(claims[p], 3)) {
      const v = snak.mainsnak?.datavalue?.value;
      if (v && typeof v === "object") {
        if ("id" in v && typeof v.id === "string") out.push(v.id);
        else if ("numericId" in v && typeof v.numericId === "number") out.push(`Q${v.numericId}`);
      }
    }
  }
  return out;
}

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
          // Jamais de Q-ID brut affiché — un libellé non résolu vaut mieux
          // vide (→ plan B suivant) qu'une chaîne « Q57553 ».
          out.push(labels.get(v.id) ?? "");
        } else if ("numericId" in v && typeof v.numericId === "number") {
          out.push(labels.get(`Q${v.numericId}`) ?? "");
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
    const cleaned = [...new Set(out.filter((s) => s.trim()))];
    if (cleaned.length) return cleaned;
  }
  return undefined;
}

/** Une seule valeur pratique (meilleur rang). */
export async function claimValue(claims: Claims, props: string[]): Promise<string | undefined> {
  const vs = await claimValues(claims, props, { max: 1 });
  return vs?.[0];
}

/**
 * Version batchée de claimValues : résout TOUS les libellés d'un ensemble de
 * specs en 1-2 appels wbgetentities au lieu d'un appel par propriété.
 * Indispensable pour le panneau de connaissance (25 propriétés en ~1s).
 */
export async function batchClaimValues(
  claims: Claims,
  specs: { key: string; props: string[]; max?: number; age?: boolean }[],
): Promise<Map<string, string[]>> {
  // 1. Collecter tous les Q-ids et unités à résoudre.
  const ids = new Set<string>();
  for (const spec of specs) {
    for (const p of spec.props) {
      for (const snak of allSnaks(claims[p], spec.max ?? 3)) {
        const v = snak.mainsnak?.datavalue?.value;
        if (v && typeof v === "object") {
          if ("id" in v && typeof v.id === "string") ids.add(v.id);
          if ("numericId" in v && typeof v.numericId === "number") ids.add(`Q${v.numericId}`);
          if ("unit" in v && typeof v.unit === "string") {
            const m = v.unit.match(/Q\d+$/);
            if (m && !UNIT_SHORT[m[0]]) ids.add(m[0]);
          }
        }
      }
    }
  }
  // 2. Un appel de résolution par tranche de 45 (limite API ~50).
  const allIds = [...ids];
  const labels = new Map<string, string>();
  for (let i = 0; i < allIds.length; i += 45) {
    const part = await resolveLabels(allIds.slice(i, i + 45));
    for (const [k, v] of part) labels.set(k, v);
  }
  // 3. Formater chaque spec avec les libellés déjà résolus.
  const out = new Map<string, string[]>();
  for (const spec of specs) {
    for (const p of spec.props) {
      const snaks = allSnaks(claims[p], spec.max ?? 3);
      if (!snaks.length) continue;
      const vals: string[] = [];
      for (const snak of snaks) {
        const dv = snak.mainsnak?.datavalue;
        if (!dv) continue;
        const v = dv.value;
        if (typeof v === "string") {
          vals.push(v);
        } else if (v && typeof v === "object") {
          if ("id" in v && typeof v.id === "string") {
            const l = labels.get(v.id);
            if (l) vals.push(l);
          } else if ("numericId" in v && typeof v.numericId === "number") {
            const l = labels.get(`Q${v.numericId}`);
            if (l) vals.push(l);
          } else if ("time" in v && typeof v.time === "string") {
            if (spec.age) {
              const birth = new Date(v.time.replace(/^\+/, ""));
              if (!Number.isNaN(birth.getTime())) {
                const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
                vals.push(`${age} ans (né(e) le ${formatTime(v.time, v.precision)})`);
              }
            } else {
              vals.push(formatTime(v.time, v.precision));
            }
          } else if ("amount" in v && typeof v.amount === "string") {
            const n = Number(v.amount);
            if (!Number.isFinite(n)) continue;
            const unitId = typeof v.unit === "string" ? (v.unit.match(/Q\d+$/)?.[0] ?? "") : "";
            const unit = UNIT_SHORT[unitId] ?? (unitId ? labels.get(unitId) ?? "" : "");
            const formatted = Math.abs(n) >= 1000
              ? Math.round(n).toLocaleString("fr-FR")
              : n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
            vals.push(unit ? `${formatted} ${unit}` : formatted);
          } else if ("text" in v && typeof v.text === "string") {
            vals.push(v.text);
          }
        }
      }
      const cleaned = [...new Set(vals.filter((s) => s.trim()))];
      if (cleaned.length) {
        out.set(spec.key, cleaned);
        break; // premier prop non vide de la spec
      }
    }
  }
  return out;
}

/** Âge courant depuis P569 — calcul réel, pas un texte figé. */
export async function ageValue(claims: Claims): Promise<string | undefined> {
  const vs = await claimValues(claims, ["P569"], { age: true, max: 1 });
  return vs?.[0];
}

export const entityUrl = (id: string) => `https://www.wikidata.org/wiki/${id}`;

/** URL directe d'un fichier Commons (P18 image, P41 drapeau…). */
export const commonsFileUrl = (filename: string, width = 640) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename.replace(/^File:/, ""))}?width=${width}`;

/** Image représentative de l'entité (P18) → URL Commons réelle. */
export async function entityImage(claims: Claims): Promise<string | undefined> {
  const snak = pickSnak(claims.P18);
  const v = snak?.mainsnak?.datavalue?.value;
  return typeof v === "string" && /\.(jpe?g|png|svg|webp|gif|tiff?)$/i.test(v)
    ? commonsFileUrl(v, 640)
    : undefined;
}
