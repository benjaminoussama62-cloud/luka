import { getRedis } from "./cache/redis";

/**
 * Rate limiting à deux étages :
 *
 *  1. Upstash Redis — fenêtre fixe ATOMIQUE (Lua INCR + PEXPIRE en un seul
 *     round trip), partagée entre toutes les instances serverless : une
 *     limite est réellement globale, pas « par lambda ».
 *  2. Map mémoire — fallback quand Redis n'est pas configuré (dev local) ou
 *     qu'il est injoignable. Reste un vrai limiteur local — jamais un laissez-
 *     passer : on dégrade vers du per-instance, on n'ouvre pas les vannes.
 */

// Fenêtre fixe atomique : le compteur et sa TTL naissent dans la même opération
// — impossible que deux requêtes concurrentes créent chacune la fenêtre.
const WINDOW_LUA = `local c = redis.call("INCR", KEYS[1])
if c == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return c`;

const buckets = new Map<string, { count: number; reset: number }>();
const MAX_BUCKETS = 10_000;

function localRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    if (buckets.size > MAX_BUCKETS) {
      // Évite une fuite mémoire si des clés s'accumulent (IP forgées).
      for (const [k, v] of buckets) {
        if (v.reset < now) buckets.delete(k);
        if (buckets.size <= MAX_BUCKETS / 2) break;
      }
    }
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function rateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const count = Number(
        await redis.eval(WINDOW_LUA, [`rl:${key}`], [windowMs]),
      );
      return count <= limit;
    } catch (e) {
      // Redis injoignable → repli sur le limiteur local (jamais fail-open).
      console.warn("[rate-limit] redis fallback:", (e as Error).message);
    }
  }
  return localRateLimit(key, limit, windowMs);
}

/**
 * IP client honnête.
 *
 * La TÊTE de x-forwarded-for est contrôlée par le client — y lire l'IP permet
 * de contourner n'importe quelle limite par spoofing. On prend donc la valeur
 * apposée par la plateforme :
 *  - x-real-ip (Vercel stamppe l'IP du pair TCP réel),
 *  - sinon la DERNIÈRE entrée de x-forwarded-for (ajoutée par l'edge Vercel,
 *    non falsifiable par l'appelant),
 *  - en self-host derrière un reverse proxy, TRUST_PROXY=1 rétablit la
 *    lecture du premier saut (proxy de confiance opéré par soi-même).
 */
export function clientIp(req: Request) {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      if (process.env.TRUST_PROXY === "1" && !process.env.VERCEL) {
        return parts[0];
      }
      return parts[parts.length - 1];
    }
  }
  return "unknown";
}

export function oauthRateLimit(req: Request, scope: string, limit = 30, windowMs = 60_000) {
  return rateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
}

export function rateLimitResponse() {
  return Response.json(
    { error: "rate_limit_exceeded", error_description: "Trop de requêtes. Réessayez dans une minute." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
}
