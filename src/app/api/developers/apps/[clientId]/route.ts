import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
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
  };

  if (body.redirectUris) {
    const uriCheck = validateRedirectUriList(body.redirectUris);
    if (!uriCheck.ok) return NextResponse.json({ error: uriCheck.error }, { status: 400 });
  }

  const app = updateOAuthClient(clientId, auth.user.id, {
    name: body.name?.trim(),
    description: body.description,
    redirectUris: body.redirectUris?.map((u) => u.trim()).filter(Boolean),
  });

  return NextResponse.json({ app });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const ok = deleteOAuthClient(clientId, auth.user.id);
  if (!ok) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
