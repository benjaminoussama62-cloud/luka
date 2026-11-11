import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";
import { createApiKey, revokeApiKey } from "@/lib/mail/transactional";

export const runtime = "nodejs";

/**
 * GET    /api/admin/mail/tx-keys — liste les clés (prefixe masqué).
 * POST   /api/admin/mail/tx-keys {app,label} — crée une clé, affichée UNE fois.
 * DELETE /api/admin/mail/tx-keys?id=… — révoque.
 */
export async function GET() {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;
  const rows = await getDb()
    .prepare(
      `SELECT id, app, key_prefix, label, status, created_at, revoked_at
       FROM mail_api_keys ORDER BY created_at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ keys: rows });
}

export async function POST(req: Request) {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { app?: string; label?: string };
  const res = await createApiKey((body.app || "") as never, (body.label || "").slice(0, 80));
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  // La clé n'est JAMAIS stockée en clair ni re-affichée : à copier maintenant.
  return NextResponse.json({ id: res.id, key: res.key }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireSection("mail");
  if (auth instanceof NextResponse) return auth;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await revokeApiKey(id);
  return NextResponse.json({ ok: true });
}
