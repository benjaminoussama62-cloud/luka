import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, unreadCount, updateAccountProfile } from "@/lib/mail/mail";

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ account: null }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ account: null });
  return NextResponse.json({
    account: {
      email: account.email,
      address: account.address,
      displayName: account.displayName,
      avatar: account.avatar,
      signature: account.signature,
      status: account.status,
      createdAt: account.createdAt,
    },
    unread: unreadCount(account.id),
  });
}

/** PATCH /api/mail/account — { displayName?, avatar? (data URL | null), signature? } */
export async function PATCH(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "session requise" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "aucune boîte" }, { status: 404 });
  if (account.status === "suspended") {
    return NextResponse.json({ error: "compte suspendu" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    displayName?: string;
    avatar?: string | null;
    signature?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "corps invalide" }, { status: 400 });

  const res = updateAccountProfile(account.id, {
    displayName: body.displayName,
    avatar: body.avatar,
    signature: body.signature,
  });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
