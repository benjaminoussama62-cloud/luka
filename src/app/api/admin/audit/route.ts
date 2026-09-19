import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminCore } from "@/lib/admin/admin-core";

export const runtime = "nodejs";

/** GET /api/admin/audit — audit trail, active alerts, pending tasks. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const logs = adminCore.getAuditLogs({
    entityType: url.searchParams.get("entityType") || undefined,
    action: url.searchParams.get("action") || undefined,
    limit: 200,
  });

  return NextResponse.json({
    ok: true,
    logs,
    alerts: adminCore.getActiveAlerts(),
    tasks: adminCore.getPendingTasks(),
  });
}

/**
 * POST /api/admin/audit
 * { action: "resolve_alert"|"process_task", id }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!auth.admin) {
    return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const { action, id } = (body ?? {}) as { action?: string; id?: string };
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  if (action === "resolve_alert") {
    const alert = adminCore.resolveAlert(id, auth.admin.id);
    if (!alert) return NextResponse.json({ error: "alerte introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, alert });
  }
  if (action === "process_task") {
    const task = adminCore.processTask(id, auth.admin.id);
    if (!task) return NextResponse.json({ error: "tâche introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, task });
  }
  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
