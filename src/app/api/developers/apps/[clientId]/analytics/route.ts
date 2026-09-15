import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getDeveloperAnalytics } from "@/lib/developers/analytics";

export async function GET(req: Request, ctx: { params: Promise<{ clientId: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { clientId } = await ctx.params;
  const days = Number(new URL(req.url).searchParams.get("days") || "30");
  const analytics = getDeveloperAnalytics(clientId, session.id, Number.isFinite(days) ? days : 30);
  if (!analytics) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  return NextResponse.json({ analytics });
}
