import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getAccountByUser, setVaultMlkemKey } from "@/lib/mail/mail";

export const runtime = "nodejs";

/**
 * Upgrade post-quantique d'un coffre existant : le client dérive la paire
 * ML-KEM-768 du trousseau (déterministe) et publie la clé publique une fois.
 * Écriture refusée si une clé est déjà enregistrée.
 */
export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  if (account.status === "suspended") {
    return NextResponse.json({ error: "Compte suspendu." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { mlkemPublic?: string } | null;
  const pub = String(body?.mlkemPublic || "");
  if (pub.length < 1400 || pub.length > 1800) {
    return NextResponse.json({ error: "Clé post-quantique invalide." }, { status: 400 });
  }
  try {
    const { ml_kem768 } = await import("@noble/post-quantum/ml-kem.js");
    const { b64ToBytes } = await import("@/lib/mail/e2ee");
    ml_kem768.encapsulate(b64ToBytes(pub));
  } catch {
    return NextResponse.json({ error: "Clé post-quantique illisible." }, { status: 400 });
  }

  const saved = setVaultMlkemKey(account.id, pub);
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
