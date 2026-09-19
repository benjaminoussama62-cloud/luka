import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { deleteProject, getProject } from "@/lib/developers/console";

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

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  if (!deleteProject(id, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
