import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { getProject } from "@/lib/developers/console";
import { getDb } from "@/lib/storage/database";
import {
  deleteOAuthClient,
  getOAuthClient,
  updateOAuthClient,
} from "@/lib/oauth-provider/clients";
import { validateRedirectUriList } from "@/lib/oauth-provider/redirect-uri";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const app = getOAuthClient(clientId);
  if (!app || (app.ownerUserId !== auth.user.id && app.ownerUserId !== "system")) {
    return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  }

  return NextResponse.json({ app });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const existing = getOAuthClient(clientId);
  if (!existing || existing.ownerUserId !== auth.user.id) {
    return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  }

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    redirectUris?: string[];
    projectId?: string | null;
    scopes?: string[];
  };

  if (body.redirectUris) {
    const uriCheck = validateRedirectUriList(body.redirectUris);
    if (!uriCheck.ok) return NextResponse.json({ error: uriCheck.error }, { status: 400 });
  }

  updateOAuthClient(clientId, auth.user.id, {
    name: body.name?.trim(),
    description: body.description,
    redirectUris: body.redirectUris?.map((u) => u.trim()).filter(Boolean),
  });

  // Project attachment + allowed scopes (validated against owned projects).
  if (body.projectId !== undefined) {
    if (body.projectId && !getProject(body.projectId, auth.user.id)) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }
    getDb()
      .prepare("UPDATE oauth_clients SET project_id = ? WHERE client_id = ?")
      .run(body.projectId || null, clientId);
  }
  if (body.scopes) {
    getDb()
      .prepare("UPDATE oauth_clients SET scopes = ? WHERE client_id = ?")
      .run(JSON.stringify(body.scopes), clientId);
  }

  return NextResponse.json({ app: getOAuthClient(clientId) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const ok = deleteOAuthClient(clientId, auth.user.id);
  if (!ok) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
