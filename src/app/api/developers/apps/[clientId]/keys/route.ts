import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/developers/credentials";

export async function GET(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const keys = listApiKeys(clientId, session.id);
  if (!keys) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ keys });
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const body = (await req.json()) as { name?: string; scopes?: string; expiresAt?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const key = createApiKey({ clientId, userId: session.id, name: body.name, scopes: body.scopes, expiresAt: body.expiresAt });
  if (!key) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ key }, { status: 201 });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !revokeApiKey(id, clientId, session.id)) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
