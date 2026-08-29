import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { getOAuthClient, rotateClientSecret } from "@/lib/oauth-provider/clients";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const { clientId } = await ctx.params;
  const existing = getOAuthClient(clientId);
  if (!existing || existing.ownerUserId !== auth.user.id) {
    return NextResponse.json({ error: "Application introuvable" }, { status: 404 });
  }

  const clientSecret = rotateClientSecret(clientId, auth.user.id);
  if (!clientSecret) {
    return NextResponse.json({ error: "Impossible de régénérer le secret" }, { status: 500 });
  }

  return NextResponse.json({ clientId, clientSecret });
}
