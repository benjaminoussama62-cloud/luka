import { getDb } from "../storage/database";

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

export async function cacheGet<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const mem = memory.get(key);
  if (mem && mem.expires > now) {
    try {
      return JSON.parse(mem.value) as T;
    } catch {
      return null;
    }
  }

  const row = getDb()
    .prepare("SELECT value, expires_at FROM cache_store WHERE key = ?")
    .get(key) as { value: string; expires_at: string } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < now) {
    getDb().prepare("DELETE FROM cache_store WHERE key = ?").run(key);
    return null;
  }

  memory.set(key, { value: row.value, expires: new Date(row.expires_at).getTime() });
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSec = 3600) {
  const json = JSON.stringify(value);
  const expires = new Date(Date.now() + ttlSec * 1000).toISOString();
  memory.set(key, { value: json, expires: Date.now() + ttlSec * 1000 });
  pruneMemory();
  getDb()
    .prepare(
      `INSERT INTO cache_store (key, value, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, expires_at=excluded.expires_at`,
    )
    .run(key, json, expires);
}

export async function cacheDel(key: string) {
  memory.delete(key);
  getDb().prepare("DELETE FROM cache_store WHERE key = ?").run(key);
}

export function cacheStats() {
  const db = getDb();
  const rows = db.prepare("SELECT COUNT(*) as c FROM cache_store").get() as { c: number };
  return { memoryKeys: memory.size, persistedKeys: rows.c, backend: "ayeba-redis-layer" };
}

/** Compatible Redis : GET search:query hash */
export async function redisGet(key: string): Promise<string | null> {
  const v = await cacheGet<string>(`redis:${key}`);
  return v;
}

export async function redisSet(key: string, value: string, ttlSec = 3600) {
  await cacheSet(`redis:${key}`, value, ttlSec);
}
