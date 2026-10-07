import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { MAX_CIPHER_BYTES } from "@/lib/mail/e2ee";
import { getAccountByUser, saveUploadBlob } from "@/lib/mail/mail";

export const runtime = "nodejs";

/** Dépose le chiffré d'une pièce jointe. Le serveur ne reçoit pas le fichier en clair. */
export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (account.status === "suspended") {
    return NextResponse.json({ error: "Compte suspendu." }, { status: 403 });
  }
  if (!rateLimit(`mail-blob:${account.id}`, 30, 60_000)) return rateLimitResponse();

  const fileIv = req.headers.get("x-file-iv") || "";
  const nameIv = req.headers.get("x-name-iv") || "";
  const nameCt = req.headers.get("x-name-ct") || "";
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length > MAX_CIPHER_BYTES) {
    return NextResponse.json({ error: "Pièce jointe trop lourde — 3 Mo maximum." }, { status: 413 });
  }
  const saved = saveUploadBlob(account.id, { bytes, fileIv, nameIv, nameCt });
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 400 });
  return NextResponse.json({ id: saved.id });
}
