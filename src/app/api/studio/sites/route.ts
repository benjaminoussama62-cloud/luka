import { NextResponse } from "next/server";
import { createSite, listSitesForUser, StudioAuthError } from "@/lib/studio/sites";
import { requireStudioUser, studioError } from "@/lib/studio/http";

export async function GET() {
  const user = await requireStudioUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ sites: listSitesForUser(user.id) });
}

export async function POST(req: Request) {
  const user = await requireStudioUser();
  if (user instanceof NextResponse) return user;
  try {
    const body = (await req.json()) as {
      domain?: string;
      displayName?: string;
      sitemapUrl?: string;
    };
    const site = createSite(user.id, {
      domain: body.domain || "",
      displayName: body.displayName,
      sitemapUrl: body.sitemapUrl,
    });
    return NextResponse.json({ site }, { status: 201 });
  } catch (e) {
    if (e instanceof StudioAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return studioError(e);
  }
}
