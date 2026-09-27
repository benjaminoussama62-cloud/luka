import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import {
  createConversionGoal,
  deleteConversionGoal,
  listConversionGoals,
  updateConversionGoal,
} from "@/lib/studio/trace-goals";

type Ctx = { params: Promise<{ siteId: string }> };

/** GET /api/studio/trace/[siteId]/goals?days=28 — objectifs + fires réels. */
export async function GET(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 28));
    const goals = listConversionGoals(owned.site.id, days);
    return NextResponse.json({ site: owned.site, days, goals });
  } catch (e) {
    return studioError(e);
  }
}

/**
 * POST /api/studio/trace/[siteId]/goals
 * { action: "create", name, eventType, value? }
 * { action: "update", id, name?, eventType?, value?, status? }
 * { action: "delete", id }
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      name?: string;
      eventType?: string;
      value?: number;
      status?: string;
    };

    if (body.action === "create") {
      if (!body.name?.trim() || !body.eventType?.trim()) {
        return NextResponse.json({ error: "name et eventType requis" }, { status: 400 });
      }
      const goal = createConversionGoal({
        siteId: owned.site.id,
        name: body.name,
        eventType: body.eventType,
        value: body.value,
      });
      return NextResponse.json({ ok: true, goal });
    }

    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });

    if (body.action === "delete") {
      deleteConversionGoal(owned.site.id, body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update") {
      const goal = updateConversionGoal(owned.site.id, body.id, {
        name: body.name,
        eventType: body.eventType,
        value: body.value,
        status: body.status,
      });
      return NextResponse.json({ ok: true, goal });
    }

    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (e) {
    return studioError(e);
  }
}
