import crypto from "crypto";
import { NextResponse } from "next/server";
import { receiveExternalMail } from "@/lib/mail/mail";

/**
 * Webhook de réception des mails entrants pour @ayeba.app.
 * Alimenté par un Cloudflare Email Worker (voir docs/cloudflare-email-worker.js)
 * ou tout provider d'inbound parse équivalent.
 *
 * Sécurité : secret partagé dans l'en-tête `x-inbound-secret`
 * (env MAIL_INBOUND_SECRET). Requêtes sans secret valide → 401.
 *
 * Payload JSON :
 *   { from, fromName?, to: string[], subject?, text?, html?, messageId? }
 */
export async function POST(req: Request) {
  const secret = process.env.MAIL_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "inbound non configuré" }, { status: 503 });
  }
  const given = req.headers.get("x-inbound-secret") || "";
  if (
    given.length !== secret.length ||
    !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        from?: string;
        fromName?: string;
        to?: string | string[];
        subject?: string;
        text?: string;
        html?: string;
        messageId?: string;
      }
    | null;
  if (!body?.from || !body?.to) {
    return NextResponse.json({ error: "from et to requis" }, { status: 400 });
  }

  const to = Array.isArray(body.to)
    ? body.to
    : String(body.to).split(/[,;\s]+/).filter(Boolean);
  // Corps : préfère le texte brut ; sinon html débarrassé des balises.
  const text =
    String(body.text || "").trim() ||
    String(body.html || "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .trim();

  const result = receiveExternalMail({
    from: body.from,
    fromName: body.fromName,
    to,
    subject: body.subject || "(sans objet)",
    body: text || "(message vide)",
    html: body.html,
    messageId: body.messageId,
  });

  return NextResponse.json({ ok: true, ...result });
}
