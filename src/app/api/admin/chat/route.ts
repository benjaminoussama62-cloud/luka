import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adminCore } from "@/lib/admin/admin-core";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

type ChatRow = {
  id: string;
  channel: string;
  admin_id: string;
  admin_name: string;
  message: string;
  created_at: string;
};

/** Team channel + per-admin DM channels ("dm:<idA>:<idB>", ids sorted). */
function dmChannel(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

function canReadChannel(channel: string, adminId: string): boolean {
  if (channel === "team") return true;
  if (channel.startsWith("dm:")) {
    const ids = channel.slice(3).split(":");
    return ids.length === 2 && ids.includes(adminId);
  }
  return false;
}

/** GET /api/admin/chat?channel=team|dm:<a>:<b>&after=<iso> — messages + roster. */
export async function GET(req: Request) {
  const auth = await requireSection("chat");
  if (auth instanceof NextResponse) return auth;
  const me = auth.admin;
  if (!me) return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });

  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") || "team";
  const after = url.searchParams.get("after") || "";
  if (!canReadChannel(channel, me.id)) {
    return NextResponse.json({ error: "canal non autorisé" }, { status: 403 });
  }

  const db = getDb();
  const messages = (
    after
      ? db
          .prepare(
            "SELECT * FROM admin_chat_messages WHERE channel = ? AND created_at > ? ORDER BY created_at ASC LIMIT 200",
          )
          .all(channel, after)
      : db
          .prepare(
            "SELECT * FROM admin_chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT 100",
          )
          .all(channel)
  ) as ChatRow[];

  const { users: members } = adminCore.listAdminUsers({ status: "active", limit: 200 });
  return NextResponse.json({
    ok: true,
    // Without `after` we fetched DESC — flip to chronological order.
    messages: after ? messages : [...messages].reverse(),
    members: members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    me: me.id,
  });
}

/** POST /api/admin/chat { to: "team" | adminId, message } */
export async function POST(req: Request) {
  const auth = await requireSection("chat");
  if (auth instanceof NextResponse) return auth;
  const me = auth.admin;
  if (!me) return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const to = String((body as { to?: string })?.to || "team");
  const message = String((body as { message?: string })?.message || "").trim();
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "message invalide" }, { status: 400 });
  }

  const channel = to === "team" ? "team" : dmChannel(me.id, to);
  if (!canReadChannel(channel, me.id)) {
    return NextResponse.json({ error: "canal non autorisé" }, { status: 403 });
  }
  if (channel !== "team") {
    const other = adminCore.getAdminUser(to);
    if (!other || other.status !== "active") {
      return NextResponse.json({ error: "destinataire introuvable" }, { status: 404 });
    }
  }

  const row: ChatRow = {
    id: randomUUID(),
    channel,
    admin_id: me.id,
    admin_name: me.name,
    message,
    created_at: new Date().toISOString(),
  };
  getDb()
    .prepare(
      "INSERT INTO admin_chat_messages (id, channel, admin_id, admin_name, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(row.id, row.channel, row.admin_id, row.admin_name, row.message, row.created_at);

  return NextResponse.json({ ok: true, message: row });
}
