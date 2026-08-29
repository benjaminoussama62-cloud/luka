import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { requestClientVerification } from "@/lib/oauth-provider/clients";
import { logOAuthAudit } from "@/lib/oauth-provider/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

  const { clientId } = await ctx.params;
  const ok = requestClientVerification(clientId, user.id);
  if (!ok) return NextResponse.json({ error: "Application introuvable" }, { status: 404 });

  logOAuthAudit({
    event: "client_created",
    clientId,
    userId: user.id,
    detail: "verification_requested",
  });

  return NextResponse.json({
    ok: true,
    message:
      "Demande enregistrée. L'équipe Ayeba vérifie votre application sous 48–72 h (comme Google OAuth App Verification).",
  });
}
