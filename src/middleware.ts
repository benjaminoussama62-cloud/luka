import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware Edge — couche WAF + rate limiting global.
 *
 * 1. www → apex (canonique)
 * 2. Blocage des sondes d'attaque : chemins .env/.git/wp-admin/phpMyAdmin,
 *    traversée de répertoire, extensions inexistantes dans cette app (.php…)
 * 3. Blocage UA de scanners connus (sqlmap, nikto, nmap…)
 * 4. Rate limit global /api/* par IP (Map par isolat Edge — efficace contre
 *    les rafales ; les routes sensibles ont leurs limites DB dédiées)
 */

// Chemins purement hostiles pour une app Next.js — jamais légitimes ici.
const ATTACK_PATH_RE =
  /\/(\.env|\.git|\.svn|\.hg|wp-admin|wp-login|wp-content|wp-includes|phpmyadmin|pma|xmlrpc\.php|vendor\/|cgi-bin|\.aws|\.ssh|etc\/passwd)|\.(php[0-9]?|aspx?|jsp|cgi|pl|py|sh|bak|sql|mdb|env|ini|log|old|swp)($|\?)/i;

const BAD_UA_RE =
  /sqlmap|nikto|nmap|masscan|acunetix|nessus|openvas|wpscan|dirbuster|gobuster|hydra|metasploit|nuclei/i;

// Fenêtrage par isolat Edge (par instance) — anti-rafale réel.
const buckets = new Map<string, { count: number; reset: number }>();

function edgeRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    if (buckets.size > 10_000) buckets.clear(); // anti-fuite mémoire
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function reject(status: number, error: string) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  // 1. Canonique : www → apex HTTPS
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const path = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") || "";
  const ip = clientIp(request);

  // 2. WAF — sondes d'attaque : 404 silencieux (on ne confirme rien)
  if (ATTACK_PATH_RE.test(path) || path.includes("..")) {
    return reject(404, "not_found");
  }
  if (BAD_UA_RE.test(ua)) {
    return reject(403, "forbidden");
  }

  // 3. Rate limit global API — plafond large, les limites fines restent
  //    dans les routes (auth, mail, oauth…).
  if (path.startsWith("/api/")) {
    if (!edgeRateLimit(`api:${ip}`, 300, 60_000)) {
      return reject(429, "rate_limit_exceeded");
    }
    // Endpoints d'auth : plafond strict anti brute-force au niveau Edge aussi
    if (/^\/api\/(auth|mail\/signin|mail\/signup|admin\/auth|oauth\/token)/.test(path)) {
      if (!edgeRateLimit(`auth:${ip}`, 30, 60_000)) {
        return reject(429, "rate_limit_exceeded");
      }
    }
  }

  // 4. En-têtes de réponse ajoutés à la volée
  const res = NextResponse.next();
  res.headers.set("X-Ayeba-Edge", "1");
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
