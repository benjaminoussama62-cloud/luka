import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import {
  deleteMessage,
  getAccountByUser,
  getMessage,
  markRead,
  moveToFolder,
  setStarred,
} from "@/lib/mail/mail";

async function ownAccount() {
  const user = await getSessionFromCookies();
  if (!user) return null;
  return getAccountByUser(user.id);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  const m = getMessage(account.id, id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!m.read) markRead(account.id, id, true);
  return NextResponse.json({ message: { ...m, read: true } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  if (!getMessage(account.id, id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { read?: boolean; starred?: boolean; folder?: string }
    | null;
  if (typeof body?.read === "boolean") markRead(account.id, id, body.read);
  if (typeof body?.starred === "boolean") setStarred(account.id, id, body.starred);
  if (typeof body?.folder === "string") moveToFolder(account.id, id, body.folder);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  if (!getMessage(account.id, id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  deleteMessage(account.id, id);
  return NextResponse.json({ ok: true });
}
