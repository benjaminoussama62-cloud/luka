import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { setPageProtection } from "@/lib/ayebi/db-sqlite";
import { authorFromSession } from "@/lib/ayebi/author";
import type { PageProtection } from "@/lib/ayebi/db-sqlite";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  const author = authorFromSession(session);
  if (author.role !== "admin") return NextResponse.json({ error: "Admin requis." }, { status: 403 });
  const { slug } = await ctx.params;
  const { protection } = (await req.json()) as { protection?: PageProtection };
  if (!protection || !["none", "semi", "full"].includes(protection)) {
    return NextResponse.json({ error: "Protection invalide." }, { status: 400 });
  }
  setPageProtection(slug, protection);
  return NextResponse.json({ ok: true, protection });
}
