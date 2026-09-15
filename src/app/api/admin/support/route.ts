import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getDb } from "@/lib/storage/database";
import { auditAdminAction, requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  const body = (await req.json()) as { email?: string; subject?: string; message?: string; priority?: string };
  if (!body.email || !body.subject || !body.message) return NextResponse.json({ error: "Email, sujet et message requis." }, { status: 400 });
  const session = await getSessionFromCookies();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  getDb().prepare("INSERT INTO support_tickets (id, user_id, email, subject, message, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, session?.id || null, body.email.trim().toLowerCase(), body.subject.trim(), body.message.trim(), body.priority || "normal", now, now);
  return NextResponse.json({ id, status: "open" }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin("support");
  if ("error" in auth) return auth.error;
  const body = (await req.json()) as { id?: string; status?: string; assignedTo?: string; priority?: string };
  if (!body.id) return NextResponse.json({ error: "Ticket requis." }, { status: 400 });
  getDb().prepare("UPDATE support_tickets SET status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to), priority = COALESCE(?, priority), updated_at = ? WHERE id = ?").run(body.status || null, body.assignedTo || null, body.priority || null, new Date().toISOString(), body.id);
  auditAdminAction(auth.user, "support.ticket_updated", "ticket", body.id);
  return NextResponse.json({ updated: true });
}
