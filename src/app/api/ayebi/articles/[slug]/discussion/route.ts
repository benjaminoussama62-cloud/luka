import { NextResponse } from "next/server";
import { authorFromSession } from "@/lib/ayebi/author";
import { addTalkMessage, getTalkMessages } from "@/lib/ayebi/server";
import { getSessionFromCookies } from "@/lib/auth-server";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const messages = getTalkMessages(slug, 80).reverse();
  return NextResponse.json({ messages });
}

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Connectez-vous pour participer." }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const body = (await req.json()) as { message?: string };
  const message = String(body.message ?? "").trim();
  if (message.length < 4) {
    return NextResponse.json({ error: "Message trop court." }, { status: 400 });
  }

  addTalkMessage(slug, { id: session.id, name: session.name }, message);
  return NextResponse.json({ ok: true });
}
