import { canUseSyncDb, getDb } from "../storage/database";
import { FR_STOPWORDS } from "./query-expansion";

/**
 * Correction orthographique appuyée sur le VOCABULAIRE RÉEL de l'index —
 * le même principe que Google : on ne corrige pas vers un dictionnaire figé,
 * on corrige vers les mots que l'index connaît vraiment (« tchisekedi » →
 * « tshisekedi » marche parce que des pages indexées contiennent le nom).
 *
 * - indexVocabulary : alimenté par indexDocument (titre ×5, corps ×1).
 * - correctSpelling : un token absent du vocabulaire est remplacé par le mot
 *   du vocabulaire le plus proche (distance de Damerau-Levenshtein bornée,
 *   fréquence maximale) — la transposition de lettres voisines compte pour 1.
 */

const TOKEN_RE = /[\p{L}\p{N}]{3,}/gu;

export function indexVocabulary(title: string, body: string): void {
  if (!canUseSyncDb()) return;
  const freq = new Map<string, number>();
  for (const m of title.toLowerCase().matchAll(TOKEN_RE)) {
    const t = m[0];
    if (t.length <= 40) freq.set(t, (freq.get(t) ?? 0) + 5);
  }
  for (const m of body.slice(0, 8000).toLowerCase().matchAll(TOKEN_RE)) {
    const t = m[0];
    if (t.length <= 40) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  if (!freq.size) return;
  const up = getDb().prepare(
    `INSERT INTO vocab_terms (term, freq) VALUES (?, ?)
     ON CONFLICT(term) DO UPDATE SET freq = freq + excluded.freq`,
  );
  for (const [t, f] of freq) up.run(t, f);
}

/** Damerau-Levenshtein (OSA) — transposition de voisins = distance 1. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      let cost = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : dp[i - 1][j - 1] + 1;
      cost = Math.min(cost, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cost = Math.min(cost, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = cost;
    }
  }
  return dp[m][n];
}

/**
 * Retourne la requête corrigée, ou undefined si rien à corriger.
 * Prudence : un token n'est corrigé que s'il est absent du vocabulaire,
 * non numérique, ≥4 lettres, et qu'un candidat à distance 1 (2 si ≥8)
 * existe — le risque de « sur-correction » reste faible quand le
 * vocabulaire est petit (index jeune).
 */
export function correctSpelling(query: string): string | undefined {
  if (!canUseSyncDb()) return undefined;
  const db = getDb();
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2);
  if (!tokens.length) return undefined;

  const hasStmt = db.prepare("SELECT 1 AS x FROM vocab_terms WHERE term = ?");
  const candStmt = db.prepare(
    `SELECT term, freq FROM vocab_terms
     WHERE term LIKE ? AND LENGTH(term) BETWEEN ? AND ?`,
  );

  let changed = false;
  const fixed = tokens.map((tok) => {
    if (tok.length < 4 || /\d/.test(tok) || FR_STOPWORDS.has(tok)) return tok;
    if (hasStmt.get(tok)) return tok;

    const maxDist = tok.length >= 8 ? 2 : 1;
    let best = "";
    let bestScore = -Infinity;
    const cands = candStmt.all(
      `${tok[0]}%`,
      Math.max(3, tok.length - 2),
      tok.length + 2,
    ) as { term: string; freq: number }[];
    for (const c of cands.slice(0, 500)) {
      if (c.term === tok) continue;
      const d = editDistance(tok, c.term);
      if (d > maxDist) continue;
      const score = Math.min(c.freq, 50) - d * 100;
      if (score > bestScore) {
        bestScore = score;
        best = c.term;
      }
    }
    if (!best) return tok;
    changed = true;
    return best;
  });

  return changed ? fixed.join(" ") : undefined;
}

const freqCache = new Map<string, number>();

/**
 * Fréquence d'un terme dans l'index (vocab_terms). Utilisée pour pondérer
 * la couverture façon IDF : matcher un terme rare vaut plus qu'un commun.
 */
export function termFreq(term: string): number {
  const cached = freqCache.get(term);
  if (cached !== undefined) return cached;
  let f = 0;
  if (canUseSyncDb()) {
    const row = getDb()
      .prepare("SELECT freq FROM vocab_terms WHERE term = ?")
      .get(term) as { freq: number } | undefined;
    f = row?.freq ?? 0;
  }
  if (freqCache.size < 50_000) freqCache.set(term, f);
  return f;
}

/** Poids de rareté façon IDF : terme absent (freq 0) ≈ 0.7, très fréquent → ~0.15. */
export function rarityWeight(term: string): number {
  return 1 / Math.sqrt(1 + termFreq(term));
}

/**
 * Autocomplete sur le vocabulaire de l'index : complète le dernier token
 * tapé par les termes les plus fréquents de l'index — les suggestions
 * reflètent ce que le moteur connaît vraiment, pas un dictionnaire figé.
 * « banque com » → « banque commerciale ».
 */
export function suggestFromVocabulary(query: string, limit = 5): string[] {
  if (!canUseSyncDb()) return [];
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const db = getDb();

  const lastSpace = q.lastIndexOf(" ");
  const head = lastSpace === -1 ? "" : q.slice(0, lastSpace + 1);
  const tail = lastSpace === -1 ? q : q.slice(lastSpace + 1);
  if (tail.length < 2 || /\d/.test(tail)) return [];

  const safeTail = tail.replace(/[%_]/g, "");
  if (!safeTail) return [];
  const cands = db
    .prepare(
      `SELECT term FROM vocab_terms WHERE term LIKE ? ORDER BY freq DESC LIMIT ?`,
    )
    .all(`${safeTail}%`, limit * 4) as { term: string }[];

  const out: string[] = [];
  for (const c of cands) {
    if (c.term === tail && head) continue;
    const s = `${head}${c.term}`;
    if (!out.includes(s)) out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}
