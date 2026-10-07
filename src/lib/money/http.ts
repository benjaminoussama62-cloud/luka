/**
 * Ayeba Money — garde-fous HTTP partagés par les routes /api/money/*.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionUser } from "@/lib/auth-server";
import { siteBaseUrl } from "@/lib/site-url";
import { MoneyError } from "./core";

export async function requireMoneyUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  return user;
}

/**
 * Anti-CSRF : les mutations exigent un Origin same-site (le cookie est
 * SameSite=Lax, mais on ajoute la vérification explicite — défense en
 * profondeur pour des endpoints financiers). Les appels sans Origin
 * (clients natifs futurs avec le même cookie) passent uniquement si le
 * header est absent — jamais s'il est étranger.
 */
export function checkSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const allowed = new Set([new URL(req.url).host, new URL(siteBaseUrl()).host]);
    if (allowed.has(new URL(origin).host)) return null;
  } catch {
    /* origin malformé → refus */
  }
  return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
}

export function idemKeyOf(req: Request, body: Record<string, unknown>): string {
  const fromHeader = req.headers.get("idempotency-key")?.trim();
  const fromBody = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  const key = fromHeader || fromBody;
  return key ? key.slice(0, 128) : "";
}

export function requireIdemKey(key: string): NextResponse | null {
  if (!key) {
    return NextResponse.json(
      { error: "Idempotency-Key requis — rejouez la même requête sans risque de double exécution" },
      { status: 400 },
    );
  }
  return null;
}

export function moneyError(e: unknown): NextResponse {
  if (e instanceof MoneyError) {
    const headers: Record<string, string> = {};
    if (e.retryAfterSec) headers["Retry-After"] = String(e.retryAfterSec);
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers });
  }
  if (e instanceof Error && e.name === "PaymentNotConfiguredError") {
    return NextResponse.json(
      { error: "Dépôts/retraits temporairement indisponibles — le partenaire de paiement n'est pas encore branché" },
      { status: 503 },
    );
  }
  console.error("[money] error:", e);
  return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
}

export function ipOf(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    ""
  );
}
