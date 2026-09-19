import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { addFlag, getFlags } from "@/lib/ayebi/db-sqlite";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const flags = getFlags(slug);
  return NextResponse.json({ flags });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const { slug } = await ctx.params;
  const { reason, detail } = (await req.json()) as { reason?: string; detail?: string };
  if (!reason) return NextResponse.json({ error: "Raison requise." }, { status: 400 });
  addFlag(slug, { id: session.id, name: session.name }, reason, detail ?? "");
  return NextResponse.json({ ok: true });
}
