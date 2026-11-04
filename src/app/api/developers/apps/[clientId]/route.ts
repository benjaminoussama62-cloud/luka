import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { getProject } from "@/lib/developers/console";
import { adb } from "@/lib/storage/adb";
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
  const app = await getOAuthClient(clientId);
  if (!app || (app.ownerUserId !== auth.user.id && app.ownerUserId !== "system")) {
    return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  }

  return NextResponse.json({ app });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const existing = await getOAuthClient(clientId);
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

  await updateOAuthClient(clientId, auth.user.id, {
    name: body.name?.trim(),
    description: body.description,
    redirectUris: body.redirectUris?.map((u) => u.trim()).filter(Boolean),
  });

  // Project attachment + allowed scopes (validated against owned projects).
  if (body.projectId !== undefined) {
    if (body.projectId && !getProject(body.projectId, auth.user.id)) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
    }
    await adb().run("UPDATE oauth_clients SET project_id = ? WHERE client_id = ?", [
      body.projectId || null,
      clientId,
    ]);
  }
  if (body.scopes) {
    await adb().run("UPDATE oauth_clients SET scopes = ? WHERE client_id = ?", [
      JSON.stringify(body.scopes),
      clientId,
    ]);
  }

  return NextResponse.json({ app: await getOAuthClient(clientId) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const ok = await deleteOAuthClient(clientId, auth.user.id);
  if (!ok) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
