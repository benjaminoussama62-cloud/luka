import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, getVaultRecord, issueVaultChallenge } from "@/lib/mail/mail";

export const runtime = "nodejs";

export async function POST() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = await getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (!await getVaultRecord(account.id)) {
    return NextResponse.json({ error: "Coffre absent." }, { status: 404 });
  }
  return NextResponse.json(await issueVaultChallenge(account.id));
}
