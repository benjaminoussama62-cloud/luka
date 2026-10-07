import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, readAttachment } from "@/lib/mail/mail";

export const runtime = "nodejs";

/** Renvoie le chiffré. Le nom et le contenu se déchiffrent sur l'appareil. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const { id } = await ctx.params;
  const file = readAttachment(account.id, id);
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(file.bytes.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
