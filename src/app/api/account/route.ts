import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionFromCookies,
} from "@/lib/auth-server";
import { deleteUserById } from "@/lib/db";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Suppression définitive du compte — utilisée par le bouton
 * « Supprimer mon compte » (Sécurité) et documentée sur
 * /suppression-compte (exigé par le formulaire Data safety de Play).
 */
export async function DELETE(req: Request) {
  if (!rateLimit(`account-delete:${clientIp(req)}`, 5, 60_000)) {
    return rateLimitResponse();
  }
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  await deleteUserById(user.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
