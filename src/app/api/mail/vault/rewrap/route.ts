import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { verifyNonce, type PassWrap } from "@/lib/mail/e2ee";
import {
  consumeVaultChallenge,
  getAccountByUser,
  getVaultRecord,
  updateVaultWraps,
} from "@/lib/mail/mail";

export const runtime = "nodejs";

function asWrap(v: unknown, minIter: number): PassWrap | null {
  if (!v || typeof v !== "object") return null;
  const o = v as PassWrap;
  if (typeof o.salt !== "string" || typeof o.iv !== "string" || typeof o.ct !== "string") return null;
  if (o.salt.length > 80 || o.iv.length > 80 || o.ct.length < 20 || o.ct.length > 20_000) return null;
  if (!Number.isInteger(o.iterations) || o.iterations < minIter || o.iterations > 800_000) return null;
  return { salt: o.salt, iv: o.iv, ct: o.ct, iterations: o.iterations };
}

/** Remplace l'enveloppe de la phrase ou de la clé de récupération. Exige une signature du coffre. */
export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const account = getAccountByUser(user.id);
  if (!account) return NextResponse.json({ error: "no mail account" }, { status: 404 });
  const vault = getVaultRecord(account.id);
  if (!vault) return NextResponse.json({ error: "Coffre absent." }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    nonce?: string;
    signature?: string;
    privWrap?: unknown;
    recoveryWrap?: unknown;
  } | null;
  const nonce = String(body?.nonce || "");
  const signature = String(body?.signature || "");
  if (!nonce || !signature) return NextResponse.json({ error: "Preuve manquante." }, { status: 400 });
  if (!consumeVaultChallenge(account.id, nonce)) {
    return NextResponse.json({ error: "Défi expiré — recommencez." }, { status: 409 });
  }
  const ok = await verifyNonce(vault.ecdsaPublic, nonce, signature);
  if (!ok) return NextResponse.json({ error: "Signature du coffre refusée." }, { status: 403 });

  const privWrap = body?.privWrap ? asWrap(body.privWrap, 600_000) : undefined;
  const recoveryWrap = body?.recoveryWrap ? asWrap(body.recoveryWrap, 120_000) : undefined;
  if (body?.privWrap && !privWrap) return NextResponse.json({ error: "Nouvelle phrase invalide." }, { status: 400 });
  if (body?.recoveryWrap && !recoveryWrap) {
    return NextResponse.json({ error: "Nouvelle clé de récupération invalide." }, { status: 400 });
  }
  if (!privWrap && !recoveryWrap) return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });

  const saved = updateVaultWraps(account.id, { privWrap: privWrap || undefined, recoveryWrap: recoveryWrap || undefined });
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
