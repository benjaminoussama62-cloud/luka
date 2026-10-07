const DEFAULT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "ayeba.app",
  "www.ayeba.app",
]);

export function jfcAllowedHosts() {
  const extra = (process.env.JFC_CORS_HOSTS || process.env.OMEGA_HOSTS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_HOSTS, ...extra]);
}

function hostAllowed(host: string) {
  const h = host.toLowerCase();
  if (jfcAllowedHosts().has(h)) return true;
  if (h.endsWith(".pages.dev")) return true;
  return false;
}

export function jfcCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  let allow = "";
  try {
    const host = origin ? new URL(origin).hostname.toLowerCase() : "";
    if (origin && hostAllowed(host)) allow = origin;
  } catch {
    allow = "";
  }
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

export function jfcPreflight(req: Request) {
  return new Response(null, { status: 204, headers: jfcCorsHeaders(req) });
}
