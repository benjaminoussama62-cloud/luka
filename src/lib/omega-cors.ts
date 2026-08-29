const DEFAULT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "omega.app",
  "www.omega.app",
  "omega-web.org",
  "www.omega-web.org",
]);

export function allowedOmegaHosts() {
  const extra = (process.env.OMEGA_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_HOSTS, ...extra]);
}

function hostAllowed(host: string) {
  const h = host.toLowerCase();
  if (allowedOmegaHosts().has(h)) return true;
  if (h.endsWith(".pages.dev") && h.includes("omega")) return true;
  return false;
}

export function isAllowedOmegaReturn(raw: string) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const path = u.pathname.replace(/\/$/, "") || "/";
    if (path !== "/ayeba/callback" && path !== "/auth/google/callback") return false;
    return hostAllowed(u.hostname);
  } catch {
    return false;
  }
}

export function omegaCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  let allow = "";
  try {
    const host = origin ? new URL(origin).hostname.toLowerCase() : "";
    if (origin && hostAllowed(host)) allow = origin;
  } catch {
    allow = "";
  }
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

export function omegaPreflight(req: Request) {
  return new Response(null, { status: 204, headers: omegaCorsHeaders(req) });
}
