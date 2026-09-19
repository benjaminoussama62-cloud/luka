/** Real request-derived context for search signals (device + geo). */

export function deviceFromUa(ua: string): "mobile" | "tablet" | "desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|opera mini|iemobile|blackberry/.test(s)) return "mobile";
  return "desktop";
}

/**
 * Country from the Vercel edge geo header (real, computed at the edge).
 * Falls back to Cloudflare's header, then empty string — never guessed.
 */
export function signalContext(req: Request): { device: string; country: string } {
  return {
    device: deviceFromUa(req.headers.get("user-agent") || ""),
    country:
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      "",
  };
}
