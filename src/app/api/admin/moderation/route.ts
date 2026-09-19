import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { moderationSystem } from "@/lib/admin/moderation-system";

export const runtime = "nodejs";

/** GET /api/admin/moderation?status=&type= — moderation queue + stats. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const { items, total } = moderationSystem.getQueue({
    status: url.searchParams.get("status") || undefined,
    type: url.searchParams.get("type") || undefined,
    limit: 200,
  });
  return NextResponse.json({ ok: true, items, total, stats: moderationSystem.getModerationStats() });
}

/**
 * POST /api/admin/moderation
 * { action: "approve"|"reject"|"under_review", itemId, notes? }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!auth.admin) {
    return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });
  }
  const adminId = auth.admin.id;

  const body = await req.json().catch(() => null);
  const { action, itemId, notes } = (body ?? {}) as {
    action?: string;
    itemId?: string;
    notes?: string;
  };
  if (!itemId || typeof itemId !== "string") {
    return NextResponse.json({ error: "itemId requis" }, { status: 400 });
  }

  let item;
  switch (action) {
    case "approve":
      item = moderationSystem.approveItem(itemId, adminId, notes);
      break;
    case "reject":
      if (!notes) return NextResponse.json({ error: "motif requis pour un rejet" }, { status: 400 });
      item = moderationSystem.rejectItem(itemId, adminId, notes);
      break;
    case "under_review":
      item = moderationSystem.markUnderReview(itemId, adminId);
      break;
    default:
      return NextResponse.json({ error: "action invalide" }, { status: 400 });
  }
  if (!item) return NextResponse.json({ error: "élément introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}
