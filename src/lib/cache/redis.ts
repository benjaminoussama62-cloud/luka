import { canUseSyncDb, getDb } from "../storage/database";

/**
 * Couche de cache à trois niveaux :
 *
 * 1. Upstash Redis  — partagé entre toutes les instances Vercel (prod)
 *                     activé si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * 2. Map mémoire    — par instance, sub-milliseconde, toujours actif en fallback
 * 3. SQLite         — local uniquement (jamais sur Turso : bloquant)
 */

// ── 1. Upstash Redis ────────────────────────────────────────────────────────

let _redis: import("@upstash/redis").Redis | null = null;

function getRedis(): import("@upstash/redis").Redis | null {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    // Lazy import — ne charge le SDK que si les variables sont présentes.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis") as typeof import("@upstash/redis");
    _redis = new Redis({ url, token });
    return _redis;
  } catch {
    return null;
  }
}

// ── 2. Map mémoire (fallback) ───────────────────────────────────────────────

const memory = new Map<string, { value: string; expires: number }>();
const MAX_MEMORY = 5000;

function pruneMemory() {
  if (memory.size <= MAX_MEMORY) return;
  const now = Date.now();
  for (const [k, v] of memory) {
    if (v.expires < now) memory.delete(k);
    if (memory.size <= MAX_MEMORY * 0.8) break;
  }
}

// ── API publique ────────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Upstash Redis
  const redis = getRedis();
  if (redis) {
    try {
      // Le SDK gère la sérialisation JSON nativement.
      const val = await redis.get<T>(key);
      return val ?? null;
    } catch {
      // Redis indisponible → on descend au niveau suivant sans planter.
    }
  }

  // 2. Map mémoire
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expires > now) {
    try { return JSON.parse(mem.value) as T; } catch { return null; }
  }

  // 3. SQLite (local uniquement — bloquant sur Turso)
  if (!canUseSyncDb()) return null;
  const row = getDb()
    .prepare("SELECT value, expires_at FROM cache_store WHERE key = ?")
    .get(key) as { value: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < now) {
    getDb().prepare("DELETE FROM cache_store WHERE key = ?").run(key);
    return null;
  }
  memory.set(key, { value: row.value, expires: new Date(row.expires_at).getTime() });
  try { return JSON.parse(row.value) as T; } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 3600) {
  // 1. Upstash Redis
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSec });
      return;
    } catch {
      // Redis indisponible → fallback mémoire + SQLite.
    }
  }

  // 2. Map mémoire + SQLite
  const json = JSON.stringify(value);
  memory.set(key, { value: json, expires: Date.now() + ttlSec * 1000 });
  pruneMemory();
  if (!canUseSyncDb()) return;
  const expires = new Date(Date.now() + ttlSec * 1000).toISOString();
  getDb()
    .prepare(
      `INSERT INTO cache_store (key, value, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at`,
    )
    .run(key, json, expires);
}

export async function cacheDel(key: string) {
  const redis = getRedis();
  if (redis) {
    try { await redis.del(key); } catch { /* ignore */ }
    return;
  }
  memory.delete(key);
  if (canUseSyncDb()) {
    getDb().prepare("DELETE FROM cache_store WHERE key = ?").run(key);
  }
}

export function cacheStats() {
  const redis = getRedis();
  const backend = redis ? "upstash-redis" : canUseSyncDb() ? "sqlite" : "memory";
  if (redis) return { memoryKeys: 0, persistedKeys: -1, backend };
  const db = getDb();
  const rows = db.prepare("SELECT COUNT(*) as c FROM cache_store").get() as { c: number };
  return { memoryKeys: memory.size, persistedKeys: rows.c, backend };
}

/** Alias compatibles avec les anciens appels redisGet/redisSet dans le code. */
export async function redisGet(key: string): Promise<string | null> {
  return cacheGet<string>(`redis:${key}`);
}

export async function redisSet(key: string, value: string, ttlSec = 3600) {
  await cacheSet(`redis:${key}`, value, ttlSec);
}
