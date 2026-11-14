import { after, NextResponse } from "next/server";
import { appFromKey, queueTx, sendQueued, drainTxQueue } from "@/lib/mail/transactional";
import { oauthRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/mail/transactional — point d'entrée unique des apps sœurs.
 *
 *   Authorization: Bearer txk_…
 *   { "app": "tala", "type": "otp", "to": "u@x.com",
 *     "locale": "fr", "data": {…}, "idempotencyKey": "otp:usr_42:…" }
 *
 * Réponses : {queued:true,id} · 401 clé · 400 payload · 403 app mismatch
 *            422 supprimé · 429 quota.
 */
export async function POST(req: Request) {
  if (!await oauthRateLimit(req, "tx-api", 120, 60_000)) return rateLimitResponse();

  const key = await appFromKey(req.headers.get("authorization"));
  if (!key) {
    return NextResponse.json({ error: "clé API manquante ou invalide" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  // Une clé n'envoie que pour SON app — pas d'usurpation cross-app.
  if (body.app !== key.app) {
    return NextResponse.json({ error: "la clé ne correspond pas à l'application déclarée" }, { status: 403 });
  }

  // defer : la réponse part tout de suite (latence ~100-300 ms au lieu
  // du round-trip SMTP ~1-3 s). L'envoi suit dans after() — et même si la
  // lambda est tuée avant, la ligne 'pending' est reprise par le drain.
  const result = await queueTx(key.app, {
    type: String(body.type || ""),
    to: String(body.to || ""),
    locale: String(body.locale || "fr"),
    data: (body.data as Record<string, string>) || {},
    idempotencyKey: String(body.idempotencyKey || ""),
  }, true);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!("duplicate" in result && result.duplicate)) {
    after(async () => {
      await sendQueued(result.id);
      await drainTxQueue(10); // purge opportuniste des jobs échus
    });
  }

  return NextResponse.json(
    { queued: true, id: result.id, ...(("duplicate" in result && result.duplicate) ? { duplicate: true } : {}) },
    { status: "duplicate" in result && result.duplicate ? 200 : 202 },
  );
}
