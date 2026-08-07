const cache = new Map<string, { allowed: boolean; expires: number }>();

export async function canFetch(url: string, userAgent = "AyebiBot/1.0"): Promise<boolean> {
  try {
    const { origin } = new URL(url);
    const cached = cache.get(origin);
    if (cached && cached.expires > Date.now()) return cached.allowed;

    const robotsUrl = `${origin}/robots.txt`;
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(4000),
      headers: { "User-Agent": userAgent },
    });

    if (!res.ok) {
      cache.set(origin, { allowed: true, expires: Date.now() + 3600000 });
      return true;
    }

    const text = await res.text();
    const path = new URL(url).pathname;
    const allowed = !isDisallowed(text, userAgent, path);
    cache.set(origin, { allowed, expires: Date.now() + 3600000 });
    return allowed;
  } catch {
    return true;
  }
}

function isDisallowed(robots: string, agent: string, path: string): boolean {
  const lines = robots.split("\n");
  let inBlock = false;
  let applies = false;

  for (const raw of lines) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;

    const [key, ...rest] = line.split(":").map((s) => s.trim());
    const val = rest.join(":").trim();

    if (key.toLowerCase() === "user-agent") {
      inBlock = true;
      applies = val === "*" || agent.toLowerCase().includes(val.toLowerCase());
    } else if (inBlock && applies && key.toLowerCase() === "disallow" && val) {
      if (path.startsWith(val)) return true;
    }
  }
  return false;
}

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.endsWith("/") && u.pathname.length > 1) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return url;
  }
}
