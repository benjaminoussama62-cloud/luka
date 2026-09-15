import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { createBot, listBots, runBot } from "@/lib/ayebi/platform";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  return NextResponse.json({ bots: listBots(session.id) });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const body = (await req.json()) as { action?: "create" | "run"; id?: string; name?: string; event?: string; config?: Record<string, unknown> };
  if (body.action === "run" && body.id) {
    try {
      const run = await runBot(body.id, session.id);
      return run ? NextResponse.json({ run }) : NextResponse.json({ error: "Bot introuvable." }, { status: 404 });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Exécution du bot impossible." }, { status: 422 });
    }
  }
  if (!body.name || !body.event) return NextResponse.json({ error: "Nom et événement requis." }, { status: 400 });
  return NextResponse.json({ bot: createBot({ name: body.name, event: body.event, config: body.config || {}, ownerId: session.id }) }, { status: 201 });
}
