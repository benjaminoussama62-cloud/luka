import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

const SEVERITIES = new Set(["info", "warning", "critical"]);
const STATUSES = new Set(["draft", "active", "archived"]);

type Auth = Exclude<Awaited<ReturnType<typeof requireSection>>, NextResponse>;

function audit(auth: Auth, action: string, entityId: string, changes: Record<string, unknown>) {
  try {
    getDb()
      .prepare(
        `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
         VALUES (?, ?, ?, ?, 'announcement', ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        auth.admin?.id ?? "env",
        auth.admin?.name ?? auth.user.name,
        action,
        entityId,
        JSON.stringify(changes),
        new Date().toISOString(),
      );
  } catch {
    /* audit best-effort */
  }
}

/** GET /api/admin/announcements — toutes les annonces, récentes d'abord. */
export async function GET() {
  const auth = await requireSection("broadcast");
  if (auth instanceof NextResponse) return auth;

  const rows = getDb()
    .prepare(
      `SELECT a.*, COALESCE(au.name, a.created_by) AS author
       FROM announcements a LEFT JOIN admin_users au ON au.id = a.created_by
       ORDER BY a.created_at DESC LIMIT 200`,
    )
    .all();
  return NextResponse.json({ ok: true, announcements: rows });
}

/** POST /api/admin/announcements — créer une annonce. */
export async function POST(req: Request) {
  const auth = await requireSection("broadcast");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
    severity?: string;
    status?: string;
  };
  const title = body.title?.trim() ?? "";
  const text = body.body?.trim() ?? "";
  if (!title || !text) {
    return NextResponse.json({ error: "Titre et message requis." }, { status: 400 });
  }
  const severity = SEVERITIES.has(body.severity ?? "") ? body.severity! : "info";
  const status = STATUSES.has(body.status ?? "") ? body.status! : "draft";

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO announcements (id, title, body, severity, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, title.slice(0, 200), text.slice(0, 2000), severity, status, auth.admin?.id ?? null, now, now);

  audit(auth, "create_announcement", id, { title, severity, status });
  return NextResponse.json({ ok: true, id });
}

/** PATCH /api/admin/announcements — modifier statut/contenu. */
export async function PATCH(req: Request) {
  const auth = await requireSection("broadcast");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    body?: string;
    severity?: string;
    status?: string;
  };
  if (!body.id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  const existing = getDb().prepare("SELECT * FROM announcements WHERE id = ?").get(body.id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "Annonce introuvable." }, { status: 404 });

  const title = body.title?.trim() || (existing.title as string);
  const text = body.body?.trim() || (existing.body as string);
  const severity = SEVERITIES.has(body.severity ?? "") ? body.severity! : (existing.severity as string);
  const status = STATUSES.has(body.status ?? "") ? body.status! : (existing.status as string);

  getDb()
    .prepare("UPDATE announcements SET title = ?, body = ?, severity = ?, status = ?, updated_at = ? WHERE id = ?")
    .run(title, text, severity, status, new Date().toISOString(), body.id);

  audit(auth, "update_announcement", body.id, { status, severity });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/announcements?id=… — supprimer. */
export async function DELETE(req: Request) {
  const auth = await requireSection("broadcast");
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  getDb().prepare("DELETE FROM announcements WHERE id = ?").run(id);
  audit(auth, "delete_announcement", id, {});
  return NextResponse.json({ ok: true });
}
