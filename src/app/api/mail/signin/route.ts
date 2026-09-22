import { NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createSigninCode, normalizePhone } from "@/lib/mail/mail";
import { sendSms, smsConfigured } from "@/lib/mail/sms";

/** Connexion Ayeba Mail : code SMS sur le numéro du compte. */
export async function POST(req: Request) {
  if (!rateLimit(`mail-signin:${clientIp(req)}`, 10, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as { phone?: string } | null;
  const phone = normalizePhone(String(body?.phone || ""));
  if (!phone) return NextResponse.json({ error: "Numéro de téléphone invalide." }, { status: 400 });
  if (!rateLimit(`mail-otp:${phone}`, 4, 10 * 60_000)) return rateLimitResponse();

  const v = createSigninCode(phone);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 404 });

  const sent = await sendSms(phone, `Ayeba Mail — votre code de connexion : ${v.code} (valide 5 min)`);
  if (sent.ok) return NextResponse.json({ ok: true, sms: true });
  if (smsConfigured()) {
    return NextResponse.json({ error: "Envoi SMS impossible — réessayez." }, { status: 502 });
  }
  console.log(`[ayeba-mail] DEV code connexion ${v.code} pour ${phone}`);
  return NextResponse.json({ ok: true, sms: false, devCode: v.code });
}
