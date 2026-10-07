import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getAccountByUser, lookupMailKeys } from "@/lib/mail/mail";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (!rateLimit(`mail-keys:${account.id}`, 60, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as { emails?: string[] } | null;
  const emails = Array.isArray(body?.emails) ? body!.emails.map((e) => String(e)).slice(0, 20) : [];
  if (!emails.length) return NextResponse.json({ error: "Aucune adresse." }, { status: 400 });
  return NextResponse.json({ keys: lookupMailKeys(emails) });
}
