// Cache des RÈGLES robots.txt par origine — jamais du verdict d'une URL :
// autoriser /a ne dit rien sur /private/b (bug corrigé : le premier chemin
// vérifié décidait pour tout le domaine).
const cache = new Map<string, { robots: string | null; expires: number }>();

export async function canFetch(url: string, userAgent = "AyebiBot/1.0"): Promise<boolean> {
  try {
    const { origin, pathname } = new URL(url);
    const cached = cache.get(origin);
    let robots: string | null;

    if (cached && cached.expires > Date.now()) {
      robots = cached.robots;
    } else {
      try {
        const res = await fetch(`${origin}/robots.txt`, {
          signal: AbortSignal.timeout(4000),
          headers: { "User-Agent": userAgent },
        });
        robots = res.ok ? await res.text() : null;
      } catch {
        robots = null;
      }
      cache.set(origin, { robots, expires: Date.now() + 3600000 });
    }

    if (robots == null) return true;
    return !isDisallowed(robots, userAgent, pathname);
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
