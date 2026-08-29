const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
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
