import { NextResponse } from "next/server";
import { createSessionToken, setSessionCookie } from "@/lib/auth-server";
import { findUserById } from "@/lib/db";
import { toSessionUser } from "@/lib/auth-server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { completeMailVerification, normalizePhone } from "@/lib/mail/mail";

export async function POST(req: Request) {
  if (!rateLimit(`mail-verify:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = normalizePhone(String(body?.phone || ""));
  const code = String(body?.code || "").trim();
  if (!phone || !code) return NextResponse.json({ error: "Numéro et code requis." }, { status: 400 });

  const r = completeMailVerification(phone, code);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });

  // La vérification SMS crée la session — jamais de login Google/Gmail ici.
  const dbUser = await findUserById(r.userId);
  if (!dbUser) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 500 });
  await setSessionCookie(await createSessionToken(toSessionUser(dbUser)));

  return NextResponse.json({
    ok: true,
    isNew: r.isNew,
    account: { email: r.account.email },
  });
}
