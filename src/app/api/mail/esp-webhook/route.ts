import crypto from "crypto";
import { NextResponse } from "next/server";
import { suppressAddress } from "@/lib/mail/transactional";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/mail/esp-webhook — événements Brevo/ESP.
 *
 * Sécurité : secret partagé `ESP_WEBHOOK_SECRET` exigé en production,
 * passé en `?token=` ou en en-tête `x-esp-token` (configurable dans le
 * tableau de bord Brevo). Sans secret configuré, l'endpoint refuse tout
 * en production — jamais de suppression arbitraire non authentifiée.
 *
 * Événements traités : hard_bounce, spam, invalid_email, blocked,
 * unsubscribed → suppression permanente. soft_bounce → journalisé seul.
 */

const SUPPRESS_EVENTS = new Set(["hard_bounce", "spam", "invalid_email", "blocked", "unsubscribed"]);

type EspEvent = { event?: string; email?: string; "message-id"?: string; reason?: string };

function authorized(req: Request): boolean {
  const secret = process.env.ESP_WEBHOOK_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-esp-token") || "";
  if (token.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export async function POST(req: Request) {
  if (!await rateLimit("esp-webhook", 300, 60_000)) return rateLimitResponse();
  if (!authorized(req)) {
    return NextResponse.json({ error: "non autorisé" }, { status: 401 });
  }

  let payload: EspEvent | EspEvent[];
  try {
    payload = (await req.json()) as EspEvent | EspEvent[];
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const events = Array.isArray(payload) ? payload : [payload];
  let suppressed = 0;
  for (const ev of events.slice(0, 100)) {
    const email = String(ev.email || "").trim().toLowerCase();
    const kind = String(ev.event || "").toLowerCase();
    if (!email || !email.includes("@")) continue;
    if (SUPPRESS_EVENTS.has(kind)) {
      await suppressAddress(email, `${kind}${ev.reason ? `: ${String(ev.reason).slice(0, 120)}` : ""}`, "webhook");
      suppressed++;
    }
  }

  return NextResponse.json({ ok: true, received: events.length, suppressed });
}
