import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { createProject, listAccessibleProjects, listProjects } from "@/lib/developers/console";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  if (new URL(req.url).searchParams.get("all")) {
    const { owned, member } = listAccessibleProjects(auth.user.id);
    return NextResponse.json({ projects: owned, memberProjects: member });
  }
  return NextResponse.json({ projects: listProjects(auth.user.id) });
}

export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();
  if (!name || name.length > 80) {
    return NextResponse.json({ error: "Nom de projet requis (80 caractères max)" }, { status: 400 });
  }
  return NextResponse.json({ project: createProject(auth.user.id, name) }, { status: 201 });
}
