import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, unreadCount } from "@/lib/mail/mail";

export async function GET() {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ account: null }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ account: null });
  return NextResponse.json({
    account: { email: account.email, address: account.address, createdAt: account.createdAt },
    unread: unreadCount(account.id),
  });
}
