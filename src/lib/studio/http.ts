import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionUser } from "@/lib/auth-server";
import { StudioAuthError, requireOwnedSite } from "@/lib/studio/sites";
import type { StudioSite } from "@/lib/studio/types";

export async function requireStudioUser(): Promise<SessionUser | NextResponse> {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  return user;
}

export async function requireStudioSite(
  siteId: string,
): Promise<{ user: SessionUser; site: StudioSite } | NextResponse> {
  const userOrRes = await requireStudioUser();
  if (userOrRes instanceof NextResponse) return userOrRes;
  try {
    const site = requireOwnedSite(userOrRes, siteId);
    return { user: userOrRes, site };
  } catch (e) {
    if (e instanceof StudioAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export function studioError(e: unknown) {
  const status = typeof e === "object" && e && "status" in e ? Number((e as { status: number }).status) : 500;
  const message = e instanceof Error ? e.message : "Erreur serveur";
  return NextResponse.json({ error: message }, { status: status || 500 });
}
