import { adb } from "../storage/adb";

/**
 * Santé des sources amont — sans elle, un scraper qui casse est invisible
 * (les fetchers retournent [] en silence). Deux niveaux :
 *  - compteurs en mémoire par instance : lecture instantanée pour /status ;
 *  - table upstream_health : historique durable pour détecter les régressions
 *    (un parser qui meurt donne ok=1 mais hits=0 en continu).
 *
 * La distinction ok/hits compte : HTTP 200 + markup changé = ok avec 0 hits
 * — c'est LE signal qu'un sélecteur est mort.
 */

export type UpstreamProbe = {
  source: string;
  /** Requête HTTP aboutie (statut 2xx lu). */
  ok: boolean;
  /** Résultats extraits — 0 malgré ok = parser probablement cassé. */
  hits: number;
  ms: number;
  error?: string;
};

type Agg = {
  calls: number;
  failures: number;
  zeroHits: number;
  msTotal: number;
  lastError?: string;
  lastAt: number;
};

const aggs = new Map<string, Agg>();

const UPSTREAM_HEALTH_SCHEMA = `
CREATE TABLE IF NOT EXISTS upstream_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  ok INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  ms INTEGER NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upstream_health_src ON upstream_health(source, created_at DESC);
`;

let schemaReady: Promise<void> | null = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = adb().exec(UPSTREAM_HEALTH_SCHEMA).catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

/** Enregistre un probe — best-effort, jamais sur le chemin critique. */
export function recordUpstream(p: UpstreamProbe) {
  const a = aggs.get(p.source) ?? {
    calls: 0,
    failures: 0,
    zeroHits: 0,
    msTotal: 0,
    lastAt: 0,
  };
  a.calls += 1;
  if (!p.ok) a.failures += 1;
  if (p.ok && p.hits === 0) a.zeroHits += 1;
  a.msTotal += p.ms;
  if (p.error) a.lastError = p.error;
  a.lastAt = Date.now();
  aggs.set(p.source, a);

  void ensureSchema()
    .then(() =>
      adb().run(
        "INSERT INTO upstream_health (source, ok, hits, ms, error, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [p.source, p.ok ? 1 : 0, p.hits, p.ms, p.error || "", new Date().toISOString()],
      ),
    )
    .catch(() => {});
}

/** Enrobe un fetcher amont : chronométrage + télémétrie, erreurs jamais silencieuses. */
export async function probed<T>(source: string, fn: () => Promise<T[]>): Promise<T[]> {
  const t0 = Date.now();
  try {
    const hits = await fn();
    recordUpstream({ source, ok: true, hits: hits.length, ms: Date.now() - t0 });
    return hits;
  } catch (e) {
    recordUpstream({
      source,
      ok: false,
      hits: 0,
      ms: Date.now() - t0,
      error: (e as Error).message.slice(0, 300),
    });
    return [];
  }
}

/** Agrégats instantanés par source — exposés par /status et l'admin. */
export function upstreamHealth() {
  const out: Record<
    string,
    { calls: number; okRate: number; zeroHitsRate: number; avgMs: number; lastError?: string; lastAt: string }
  > = {};
  for (const [source, a] of aggs) {
    out[source] = {
      calls: a.calls,
      okRate: a.calls ? +(1 - a.failures / a.calls).toFixed(3) : 0,
      zeroHitsRate: a.calls ? +(a.zeroHits / a.calls).toFixed(3) : 0,
      avgMs: a.calls ? Math.round(a.msTotal / a.calls) : 0,
      lastError: a.lastError,
      lastAt: a.lastAt ? new Date(a.lastAt).toISOString() : "",
    };
  }
  return out;
}
