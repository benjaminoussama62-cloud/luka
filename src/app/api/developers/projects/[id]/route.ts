import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { deleteProject, getProject, updateProjectName } from "@/lib/developers/console";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const project = getProject(id, auth.user.id);
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  if (!updateProjectName(id, auth.user.id, body.name)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!deleteProject(id, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
