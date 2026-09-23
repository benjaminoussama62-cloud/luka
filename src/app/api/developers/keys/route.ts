import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import {
  createApiKey,
  listApiKeys,
  listProjectApiKeys,
  projectAccess,
  type ApiKeyRestrictions,
} from "@/lib/developers/console";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  if (projectId) {
    if (!projectAccess(projectId, auth.user.id)) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }
    return NextResponse.json({ keys: listProjectApiKeys(projectId) });
  }
  return NextResponse.json({ keys: listApiKeys(auth.user.id) });
}

export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const body = (await req.json()) as {
    projectId?: string;
    name?: string;
    scopes?: string[];
    restrictions?: ApiKeyRestrictions;
    quotaPerDay?: number;
  };
  if (!body.projectId || !body.name?.trim()) {
    return NextResponse.json({ error: "Projet et nom requis" }, { status: 400 });
  }
  const created = createApiKey(auth.user.id, body.projectId, {
    name: body.name,
    scopes: body.scopes,
    restrictions: body.restrictions,
    quotaPerDay: body.quotaPerDay,
  });
  if (!created) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  // secret is returned once — it is stored only as a hash.
  return NextResponse.json(created, { status: 201 });
}
