import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createVerification, normalizePhone } from "@/lib/mail/mail";
import { sendSms, smsConfigured } from "@/lib/mail/sms";

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (!rateLimit(`mail-signup:${clientIp(req)}`, 10, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as { address?: string; phone?: string } | null;
  const address = String(body?.address || "").toLowerCase().trim();
  const phone = normalizePhone(String(body?.phone || ""));
  if (!phone) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  if (!rateLimit(`mail-otp:${phone}`, 4, 10 * 60_000)) return rateLimitResponse();

  const v = createVerification(user.id, phone, address);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 409 });

  const text = `Ayeba Mail — votre code de vérification : ${v.code} (valide 5 min)`;
  const sent = await sendSms(phone, text);
  if (sent.ok) return NextResponse.json({ ok: true, sms: true });

  if (smsConfigured()) {
    return NextResponse.json({ error: "Envoi SMS impossible — réessayez." }, { status: 502 });
  }
  // Mode développement : aucun provider configuré — le code est retourné
  // explicitement et l'interface l'affiche comme mode dev, jamais comme un envoi.
  console.log(`[ayeba-mail] DEV code ${v.code} pour ${phone}`);
  return NextResponse.json({ ok: true, sms: false, devCode: v.code });
}
