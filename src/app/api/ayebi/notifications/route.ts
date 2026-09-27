import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import {
  countUnreadNotifications,
  getUserNotifications,
  markNotificationsRead,
} from "@/lib/ayebi/db-sqlite";

export const runtime = "nodejs";

/** GET — notifications de la liste de suivi (modifications d'articles suivis). */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  return NextResponse.json({
    unread: countUnreadNotifications(session.id),
    notifications: getUserNotifications(session.id, 50),
  });
}

/** PATCH — marquer lu : { ids?: string[] } (tous si ids omis). */
export async function PATCH(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string").slice(0, 100) : undefined;
  const updated = markNotificationsRead(session.id, ids);
  return NextResponse.json({
    updated,
    unread: countUnreadNotifications(session.id),
  });
}
