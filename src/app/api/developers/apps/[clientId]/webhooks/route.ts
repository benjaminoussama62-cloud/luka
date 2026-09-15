import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createWebhook, deleteWebhook, listWebhooks } from "@/lib/developers/webhooks";

export async function GET(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const webhooks = listWebhooks(clientId, session.id);
  if (!webhooks) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ webhooks });
}

export async function POST(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const body = (await req.json()) as { url?: string; events?: string[] };
  if (!body.url || !Array.isArray(body.events) || body.events.length === 0) return NextResponse.json({ error: "URL et événements requis" }, { status: 400 });
  try {
    const webhook = createWebhook({ clientId, userId: session.id, url: body.url, events: body.events });
    if (!webhook) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
    return NextResponse.json({ webhook }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook invalide" }, { status: 400 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !deleteWebhook(id, clientId, session.id)) return NextResponse.json({ error: "Webhook introuvable" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
