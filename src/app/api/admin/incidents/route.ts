import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

const SEVERITIES = new Set(["minor", "major", "critical"]);
const STATUSES = new Set(["investigating", "identified", "monitoring", "resolved"]);
export const INCIDENT_SERVICES = [
  "Recherche",
  "Ayebi",
  "Studio",
  "Developers",
  "Identité",
  "Paiements",
  "Publicité",
] as const;

type Auth = Exclude<Awaited<ReturnType<typeof requireSection>>, NextResponse>;

function audit(auth: Auth, action: string, entityId: string, changes: Record<string, unknown>) {
  try {
    getDb()
      .prepare(
        `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
         VALUES (?, ?, ?, ?, 'incident', ?, ?, ?)`,
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

/** GET /api/admin/incidents — incidents + leurs mises à jour. */
export async function GET() {
  const auth = await requireSection("incidents");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT i.*, COALESCE(au.name, i.created_by) AS author
       FROM incidents i LEFT JOIN admin_users au ON au.id = i.created_by
       ORDER BY i.created_at DESC LIMIT 100`,
    )
    .all() as Record<string, unknown>[];

  const updates = db
    .prepare("SELECT * FROM incident_updates ORDER BY created_at ASC")
    .all() as Record<string, unknown>[];

  const byIncident = new Map<string, Record<string, unknown>[]>();
  for (const u of updates) {
    const k = u.incident_id as string;
    if (!byIncident.has(k)) byIncident.set(k, []);
    byIncident.get(k)!.push(u);
  }

  return NextResponse.json({
    ok: true,
    incidents: rows.map((r) => ({
      ...r,
      affected_services: JSON.parse((r.affected_services as string) || "[]"),
      updates: byIncident.get(r.id as string) ?? [],
    })),
    services: INCIDENT_SERVICES,
  });
}

/** POST /api/admin/incidents — déclarer un incident. */
export async function POST(req: Request) {
  const auth = await requireSection("incidents");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string;
    severity?: string;
    affectedServices?: string[];
  };
  const title = body.title?.trim() ?? "";
  if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });

  const severity = SEVERITIES.has(body.severity ?? "") ? body.severity! : "minor";
  const services = Array.isArray(body.affectedServices)
    ? body.affectedServices.filter((s) => typeof s === "string").slice(0, 10)
    : [];

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = getDb();
  db.prepare(
    `INSERT INTO incidents (id, title, description, severity, status, affected_services, created_by, created_at)
     VALUES (?, ?, ?, ?, 'investigating', ?, ?, ?)`,
  ).run(id, title.slice(0, 200), (body.description ?? "").slice(0, 2000), severity, JSON.stringify(services), auth.admin?.id ?? null, now);
  db.prepare(
    "INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, 'investigating', ?, ?)",
  ).run(crypto.randomUUID(), id, "Incident déclaré — investigation en cours.", now);

  audit(auth, "create_incident", id, { title, severity, services });
  return NextResponse.json({ ok: true, id });
}

/** PATCH /api/admin/incidents — publier une mise à jour / résoudre. */
export async function PATCH(req: Request) {
  const auth = await requireSection("incidents");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    message?: string;
  };
  if (!body.id || !STATUSES.has(body.status ?? "")) {
    return NextResponse.json({ error: "id et status valides requis." }, { status: 400 });
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM incidents WHERE id = ?").get(body.id);
  if (!existing) return NextResponse.json({ error: "Incident introuvable." }, { status: 404 });

  const now = new Date().toISOString();
  const resolvedAt = body.status === "resolved" ? now : null;
  db.prepare("UPDATE incidents SET status = ?, resolved_at = COALESCE(?, resolved_at) WHERE id = ?").run(
    body.status,
    resolvedAt,
    body.id,
  );
  db.prepare(
    "INSERT INTO incident_updates (id, incident_id, status, message, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    crypto.randomUUID(),
    body.id,
    body.status,
    (body.message ?? "").trim().slice(0, 1000) || `Statut : ${body.status}`,
    now,
  );

  audit(auth, "update_incident", body.id, { status: body.status });
  return NextResponse.json({ ok: true });
}
