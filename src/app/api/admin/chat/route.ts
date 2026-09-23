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

type GroupRow = { id: string; name: string; created_by: string; created_at: string };

/** Team channel + per-admin DM channels ("dm:<idA>:<idB>") + groups ("grp:<id>"). */
function dmChannel(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

function isGroupMember(groupId: string, adminId: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM admin_chat_group_members WHERE group_id = ? AND admin_id = ?")
    .get(groupId, adminId) as { ok: number } | undefined;
  return Boolean(row);
}

function canReadChannel(channel: string, adminId: string): boolean {
  if (channel === "team") return true;
  if (channel.startsWith("dm:")) {
    const ids = channel.slice(3).split(":");
    return ids.length === 2 && ids.includes(adminId);
  }
  if (channel.startsWith("grp:")) return isGroupMember(channel.slice(4), adminId);
  return false;
}

function myGroups(adminId: string) {
  return getDb()
    .prepare(
      `SELECT g.id, g.name, g.created_by, g.created_at,
              (SELECT COUNT(*) FROM admin_chat_group_members m WHERE m.group_id = g.id) AS members
       FROM admin_chat_groups g
       JOIN admin_chat_group_members mm ON mm.group_id = g.id
       WHERE mm.admin_id = ?
       ORDER BY g.created_at DESC`,
    )
    .all(adminId) as Array<GroupRow & { members: number }>;
}

/** GET /api/admin/chat?channel=team|dm:<a>:<b>|grp:<id>&after=<iso> — messages + roster. */
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
    groups: myGroups(me.id),
    me: me.id,
  });
}

/**
 * POST /api/admin/chat
 *   { to: "team" | adminId | "grp:<id>", message }
 *   { action: "createGroup", name, memberIds: string[] }
 */
export async function POST(req: Request) {
  const auth = await requireSection("chat");
  if (auth instanceof NextResponse) return auth;
  const me = auth.admin;
  if (!me) return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });

  const body = await req.json().catch(() => null);

  // ── Création de groupe ──
  if ((body as { action?: string })?.action === "createGroup") {
    const name = String((body as { name?: string })?.name || "").trim().slice(0, 60);
    const memberIds = Array.isArray((body as { memberIds?: unknown })?.memberIds)
      ? ((body as { memberIds: unknown[] }).memberIds as string[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [];
    if (name.length < 2) {
      return NextResponse.json({ error: "nom de groupe invalide" }, { status: 400 });
    }
    const db = getDb();
    const gid = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO admin_chat_groups (id, name, created_by, created_at) VALUES (?, ?, ?, ?)",
    ).run(gid, name, me.id, now);
    const ins = db.prepare(
      "INSERT OR IGNORE INTO admin_chat_group_members (group_id, admin_id, added_at) VALUES (?, ?, ?)",
    );
    const roster = new Set([me.id, ...memberIds]);
    for (const mid of roster) {
      const admin = adminCore.getAdminUser(mid);
      if (admin && admin.status === "active") ins.run(gid, mid, now);
    }
    const group = myGroups(me.id).find((g) => g.id === gid);
    return NextResponse.json({ ok: true, group });
  }

  const to = String((body as { to?: string })?.to || "team");
  const message = String((body as { message?: string })?.message || "").trim();
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "message invalide" }, { status: 400 });
  }

  const channel =
    to === "team" ? "team" : to.startsWith("grp:") ? to : dmChannel(me.id, to);
  if (!canReadChannel(channel, me.id)) {
    return NextResponse.json({ error: "canal non autorisé" }, { status: 403 });
  }
  if (channel.startsWith("dm:")) {
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
