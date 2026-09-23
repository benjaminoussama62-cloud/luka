import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { projectAccess, listEnabledApis, setApiEnabled } from "@/lib/developers/console";
import { API_CATALOG, catalogEntry } from "@/lib/developers/catalog";

export const runtime = "nodejs";

/** GET /api/developers/apis?projectId=… → catalogue + état d'activation */
export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId || !projectAccess(projectId, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const enabled = new Set(listEnabledApis(projectId));
  return NextResponse.json({
    apis: API_CATALOG.map((a) => ({ ...a, enabled: enabled.has(a.id) })),
  });
}

/** POST {projectId, apiId, enabled} — active/désactive une API sur le projet */
export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => null)) as
    | { projectId?: string; apiId?: string; enabled?: boolean }
    | null;
  if (!body?.projectId || !body.apiId) {
    return NextResponse.json({ error: "projectId et apiId requis" }, { status: 400 });
  }
  const role = projectAccess(body.projectId, auth.user.id);
  if (role !== "owner" && role !== "editor") {
    return NextResponse.json({ error: "Accès insuffisant" }, { status: 403 });
  }
  if (!catalogEntry(body.apiId)) {
    return NextResponse.json({ error: "API inconnue" }, { status: 404 });
  }
  setApiEnabled(body.projectId, body.apiId, Boolean(body.enabled), auth.user.id);
  return NextResponse.json({ ok: true });
}
