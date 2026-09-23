import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import {
  addMemberByEmail,
  listMembers,
  projectAccess,
  removeMember,
} from "@/lib/developers/console";

export const runtime = "nodejs";

/** GET /api/developers/members?projectId=… */
export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId || !projectAccess(projectId, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  return NextResponse.json({ members: listMembers(projectId) });
}

/** POST {projectId, email, role} — ajoute un membre (owner uniquement) */
export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => null)) as
    | { projectId?: string; email?: string; role?: string }
    | null;
  const role = body?.role === "editor" ? "editor" : "viewer";
  if (!body?.projectId || !body.email) {
    return NextResponse.json({ error: "projectId et email requis" }, { status: 400 });
  }
  const res = addMemberByEmail(body.projectId, auth.user.id, body.email, role);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res, { status: 201 });
}

/** DELETE {projectId, userId} — retire un membre (owner uniquement) */
export async function DELETE(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => null)) as
    | { projectId?: string; userId?: string }
    | null;
  if (!body?.projectId || !body.userId) {
    return NextResponse.json({ error: "projectId et userId requis" }, { status: 400 });
  }
  if (projectAccess(body.projectId, auth.user.id) !== "owner") {
    return NextResponse.json({ error: "Seul le propriétaire retire les membres" }, { status: 403 });
  }
  if (!removeMember(body.projectId, auth.user.id, body.userId)) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
