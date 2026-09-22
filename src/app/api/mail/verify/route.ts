import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { normalizePhone, verifyAndCreateAccount } from "@/lib/mail/mail";

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (!rateLimit(`mail-verify:${clientIp(req)}`, 20, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as { phone?: string; code?: string } | null;
  const phone = normalizePhone(String(body?.phone || ""));
  const code = String(body?.code || "").trim();
  if (!phone || !code) return NextResponse.json({ error: "Numéro et code requis." }, { status: 400 });

  const r = verifyAndCreateAccount(user.id, phone, code);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 409 });
  return NextResponse.json({ ok: true, account: { email: r.account.email } });
}
