import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { studioDashboard } from "@/lib/studio/dashboard";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/studio/sites/[id]/dashboard — agrégat réel des 5 modules. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireStudioSite(id);
  if (owned instanceof NextResponse) return owned;
  try {
    return NextResponse.json({ dashboard: studioDashboard(owned.site) });
  } catch (e) {
    return studioError(e);
  }
}
