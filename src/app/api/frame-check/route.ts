import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/frame-check?url=https://site.com
 * Répond si le site autorise l'affichage en iframe (X-Frame-Options / CSP frame-ancestors).
 * Le client InAppBrowser peut ainsi afficher la page d'erreur AYEBA au lieu
 * de l'erreur générique ERR_BLOCKED_BY_RESPONSE du système.
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") || "";
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ ok: false, blocked: true, reason: "invalid_url" });
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return NextResponse.json({ ok: false, blocked: true, reason: "invalid_scheme" });
  }

  try {
    const res = await fetch(target.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "AyebaBrowser/1.0 (+https://ayeba.app)" },
    });
    const xfo = (res.headers.get("x-frame-options") || "").trim().toUpperCase();
    const csp = res.headers.get("content-security-policy") || "";
    const frameAncestors = /frame-ancestors\s+[^;]*'none'/i.test(csp)
      || /frame-ancestors\s+[^;]*'self'/i.test(csp);
    const blocked = xfo === "DENY" || xfo === "SAMEORIGIN" || frameAncestors;
    return NextResponse.json({ ok: true, blocked, status: res.status });
  } catch {
    // HEAD refusé par certains sites : on tente un GET minimal
    try {
      const res = await fetch(target.toString(), {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "AyebaBrowser/1.0 (+https://ayeba.app)",
          Range: "bytes=0-0",
        },
      });
      const xfo = (res.headers.get("x-frame-options") || "").trim().toUpperCase();
      const csp = res.headers.get("content-security-policy") || "";
      const blocked =
        xfo === "DENY" || xfo === "SAMEORIGIN" ||
        /frame-ancestors\s+[^;]*'(none|self)'/i.test(csp);
      return NextResponse.json({ ok: true, blocked, status: res.status });
    } catch {
      return NextResponse.json({ ok: false, blocked: false, reason: "unreachable" });
    }
  }
}
