import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import {
  deleteMessage,
  getAccountByUser,
  getMessage,
  markRead,
  moveToFolder,
  setStarred,
  snoozeMessage,
} from "@/lib/mail/mail";

async function ownAccount() {
  const user = await getSessionFromCookies();
  if (!user) return null;
  return await getAccountByUser(user.id);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  const m = await getMessage(account.id, id);
  if (!m) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!m.read) await markRead(account.id, id, true);
  return NextResponse.json({ message: { ...m, read: true } });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  if (!await getMessage(account.id, id)) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { read?: boolean; starred?: boolean; folder?: string; snoozeUntil?: string }
    | null;
  if (typeof body?.read === "boolean") await markRead(account.id, id, body.read);
  if (typeof body?.starred === "boolean") await setStarred(account.id, id, body.starred);
  if (typeof body?.folder === "string") await moveToFolder(account.id, id, body.folder);
  if (typeof body?.snoozeUntil === "string") {
    const until = new Date(body.snoozeUntil);
    if (!isNaN(until.getTime()) && until.getTime() > Date.now() && until.getTime() < Date.now() + 366 * 86400e3) {
      await snoozeMessage(account.id, id, until.toISOString());
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const account = await ownAccount();
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  if (!await getMessage(account.id, id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  await deleteMessage(account.id, id);
  return NextResponse.json({ ok: true });
}
