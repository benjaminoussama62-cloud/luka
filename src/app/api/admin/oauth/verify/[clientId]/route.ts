import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { logOAuthAudit } from "@/lib/oauth-provider/audit";
import { verifyOAuthClient } from "@/lib/oauth-provider/clients";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

function isAdmin(email: string) {
  const list = (process.env.AYEBA_ADMIN_EMAILS || process.env.AYEBA_OAUTH_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionFromCookies();
  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { clientId } = await ctx.params;
  const ok = verifyOAuthClient(clientId);
  if (!ok) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  logOAuthAudit({
    event: "client_verified",
    clientId,
    userId: user.id,
    detail: `verified by ${user.email}`,
  });

  return NextResponse.json({ ok: true, clientId });
}
