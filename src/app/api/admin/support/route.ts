import { NextResponse } from "next/server";
import { hasAdminPermission, requireSection } from "@/lib/admin/auth";
import { supportSystem } from "@/lib/admin/support-system";

export const runtime = "nodejs";

/** GET /api/admin/support?status=&id= — tickets list or one ticket with messages. */
export async function GET(req: Request) {
  const auth = await requireSection("support");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const ticket = supportSystem.getTicket(id);
    if (!ticket) return NextResponse.json({ error: "ticket introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, ticket });
  }

  const { tickets, total } = supportSystem.getTickets({
    status: url.searchParams.get("status") || undefined,
    category: url.searchParams.get("category") || undefined,
    limit: 200,
  });
  return NextResponse.json({ ok: true, tickets, total, stats: supportSystem.getTicketStats() });
}

/**
 * POST /api/admin/support
 * { action: "reply"|"status"|"assign", ticketId, message?, status?, resolution? }
 */
export async function POST(req: Request) {
  const auth = await requireSection("support");
  if (auth instanceof NextResponse) return auth;
  if (!auth.admin) {
    return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });
  }
  const adminId = auth.admin.id;
  const adminName = auth.admin.name;

  const body = await req.json().catch(() => null);
  const { action, ticketId, message, status, resolution } = (body ?? {}) as {
    action?: string;
    ticketId?: string;
    message?: string;
    status?: string;
    resolution?: string;
  };
  if (!ticketId || typeof ticketId !== "string") {
    return NextResponse.json({ error: "ticketId requis" }, { status: 400 });
  }

  const allowed = (perm: string) =>
    hasAdminPermission(auth.admin, auth.envListed, perm) ||
    hasAdminPermission(auth.admin, auth.envListed, "support.all");

  if (action === "reply") {
    if (!allowed("support.respond")) {
      return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
    }
    if (!message?.trim()) return NextResponse.json({ error: "message requis" }, { status: 400 });
    const msg = supportSystem.addMessage({
      ticketId,
      senderId: adminId,
      senderName: adminName,
      senderType: "admin",
      message: message.trim(),
      isInternal: false,
    });
    return NextResponse.json({ ok: true, message: msg });
  }

  if (action === "assign") {
    if (!allowed("support.assign")) {
      return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
    }
    const ticket = supportSystem.assignTicket(ticketId, adminId);
    if (!ticket) return NextResponse.json({ error: "ticket introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, ticket });
  }

  if (action === "status") {
    if (!allowed("support.respond")) {
      return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
    }
    const allowedStatuses = new Set(["open", "in_progress", "waiting_customer", "resolved", "closed"]);
    if (!status || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: "statut invalide" }, { status: 400 });
    }
    const ticket = supportSystem.updateTicket(ticketId, {
      status: status as "open" | "in_progress" | "waiting_customer" | "resolved" | "closed",
      resolution,
      assignedTo: adminId,
    });
    if (!ticket) return NextResponse.json({ error: "ticket introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true, ticket });
  }

  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
