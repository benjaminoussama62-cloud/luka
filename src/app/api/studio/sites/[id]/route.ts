import { NextResponse } from "next/server";
import { deleteSite, updateSite } from "@/lib/studio/sites";
import { requireStudioSite, requireStudioUser, studioError } from "@/lib/studio/http";
import { verificationInstructions } from "@/lib/studio/verify";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireStudioSite(id);
  if (owned instanceof NextResponse) return owned;
  return NextResponse.json({
    site: owned.site,
    verification: verificationInstructions(owned.site),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const owned = await requireStudioSite(id);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as { displayName?: string; sitemapUrl?: string };
    const site = updateSite(id, body);
    return NextResponse.json({ site });
  } catch (e) {
    return studioError(e);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const user = await requireStudioUser();
  if (user instanceof NextResponse) return user;
  try {
    deleteSite(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return studioError(e);
  }
}
