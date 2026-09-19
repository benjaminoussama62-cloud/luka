/**
 * Sister-app ad network access control.
 * Each sister app (jemsa, tala, omega, sombateka, ayeba) authenticates
 * ad requests with its own server-held key: AD_KEY_<SLUG>.
 * CORS is restricted to the app's production domains only.
 */

import { safeEqual } from "@/lib/security/sign";

export type SisterAdApp = {
  slug: string;
  domains: string[];
};

export const SISTER_AD_APPS: SisterAdApp[] = [
  { slug: "ayeba", domains: ["ayeba.app", "www.ayeba.app"] },
  { slug: "omega", domains: ["omega-web.org", "www.omega-web.org", "omega.app"] },
  { slug: "jemsa", domains: ["jemsa.net", "www.jemsa.net"] },
  { slug: "tala", domains: ["to-tala.com", "www.to-tala.com", "tala.cd"] },
  { slug: "sombateka", domains: ["sombatekaonline.com", "www.sombatekaonline.com"] },
];

const DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function findSisterApp(slug: string): SisterAdApp | undefined {
  return SISTER_AD_APPS.find((a) => a.slug === slug.toLowerCase());
}

/** Env var holding the ad-serving key for an app: AD_KEY_JEMSA etc. */
function expectedKey(slug: string): string {
  return process.env[`AD_KEY_${slug.toUpperCase()}`]?.trim() || "";
}

/**
 * Authenticate an ad-serving request. In production the per-app key
 * MUST be configured — requests are rejected otherwise (fail closed).
 * In local development, missing keys are tolerated.
 */
export function verifyAdKey(slug: string, key: string): boolean {
  const expected = expectedKey(slug);
  if (!expected) {
    return process.env.NODE_ENV === "development";
  }
  return !!key && safeEqual(key, expected);
}

/** All domains allowed to request ads (one per sister app). */
export function allowedAdHosts(): Set<string> {
  const hosts = new Set<string>();
  for (const app of SISTER_AD_APPS) for (const d of app.domains) hosts.add(d);
  if (process.env.NODE_ENV === "development") {
    hosts.add("localhost");
    hosts.add("127.0.0.1");
  }
  return hosts;
}

/** CORS headers restricted to the requesting app's own domains. */
export function adCorsHeaders(req: Request, slug?: string): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  let allow = "";
  try {
    const host = origin ? new URL(origin).hostname.toLowerCase() : "";
    if (!origin || !host) {
      allow = "";
    } else if (slug) {
      const app = findSisterApp(slug);
      const ok =
        app?.domains.includes(host) ||
        (process.env.NODE_ENV === "development" && DEV_HOSTS.has(host));
      if (ok) allow = origin;
    } else if (allowedAdHosts().has(host)) {
      allow = origin;
    }
  } catch {
    allow = "";
  }
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Ayeba-Ad-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}
