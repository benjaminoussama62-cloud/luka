import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getAccountByUser, getThread, listMessages, sendMail } from "@/lib/mail/mail";

export async function GET(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });

  const url = new URL(req.url);
  const thread = url.searchParams.get("thread");
  if (thread) {
    return NextResponse.json({ messages: getThread(account.id, thread) });
  }
  const folder = url.searchParams.get("folder") || "inbox";
  const q = url.searchParams.get("q") || "";
  // Data-saver : la liste ne transporte que l'extrait (~140 car.) — le corps
  // complet n'est téléchargé qu'à l'ouverture via GET /messages/[id].
  const messages = listMessages(account.id, folder, q).map((m) => ({
    ...m,
    body: m.body.replace(/\s+/g, " ").slice(0, 140),
  }));
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (!rateLimit(`mail-send:${account.id}`, 60, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as
    | { to?: string | string[]; subject?: string; body?: string }
    | null;
  const to = Array.isArray(body?.to)
    ? body!.to!
    : String(body?.to || "").split(/[,;\s]+/).filter(Boolean);
  const subject = String(body?.subject || "").slice(0, 300);
  const text = String(body?.body || "").slice(0, 50_000);
  if (!to.length) return NextResponse.json({ error: "Destinataire requis." }, { status: 400 });
  if (to.length > 20) return NextResponse.json({ error: "Trop de destinataires." }, { status: 400 });

  const result = sendMail(account, to, subject, text);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
