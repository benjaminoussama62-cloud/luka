import { NextResponse } from "next/server";
import { appFromKey } from "@/lib/mail/transactional";
import { verifySmtp } from "@/lib/mail/smtp";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

/**
 * GET /api/mail/tx-queue — diagnostic de la file transactionnelle.
 *
 *   Authorization: Bearer txk_…
 *
 * Renvoie l'état du relais SMTP (verifySmtp) et les 25 dernières lignes de
 * mail_outbound_queue limitées à l'app authentifiée — status, tentatives
 * et last_error. Permet de distinguer « partis » / « rejetés » / « spam ».
 */
export async function GET(req: Request) {
  const key = await appFromKey(req.headers.get("authorization"));
  if (!key) {
    return NextResponse.json({ error: "clé API manquante ou invalide" }, { status: 401 });
  }
  const smtp = await verifySmtp().catch((e: unknown) => ({ ok: false, error: (e as Error).message }));
  // Config du relais (sans secret) — pour identifier le compte/provider réel.
  const relay = {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || "587",
    user: process.env.SMTP_USER || "",
    from: process.env.SMTP_FROM || "",
    dkimDomain: process.env.DKIM_DOMAIN || "",
    dkimSelector: process.env.DKIM_SELECTOR || "",
    verifiedDomains: process.env.SMTP_VERIFIED_DOMAINS || "",
  };
  const rows = (await adb().all(
    `SELECT id, type, to_addr, status, attempts, last_error, created_at, sent_at
     FROM mail_outbound_queue WHERE app = ? ORDER BY created_at DESC LIMIT 25`,
    [key.app],
  )) as Record<string, unknown>[];
  return NextResponse.json({ ok: true, smtp, relay, queue: rows });
}
