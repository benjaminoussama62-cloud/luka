import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, listContacts } from "@/lib/mail/mail";

/** GET /api/mail/contacts — correspondants connus pour l'autocomplete du compose. */
export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = await getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  return NextResponse.json({ contacts: await listContacts(account.id) });
}
