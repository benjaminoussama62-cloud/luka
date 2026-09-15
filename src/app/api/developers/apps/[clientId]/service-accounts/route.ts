import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createServiceAccount, listServiceAccounts } from "@/lib/developers/credentials";

export async function GET(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const accounts = listServiceAccounts(clientId, session.id);
  if (!accounts) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ accounts });
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const body = (await req.json()) as { name?: string; scopes?: string };
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const account = createServiceAccount({ clientId, userId: session.id, name: body.name, scopes: body.scopes });
  if (!account) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ account }, { status: 201 });
}
