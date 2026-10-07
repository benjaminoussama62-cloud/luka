import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { fingerprintSpki, importPublic } from "@/lib/mail/e2ee";
import type { PassWrap } from "@/lib/mail/e2ee";
import {
  getAccountByUser,
  getVaultRecord,
  migrateLegacyToVault,
  saveVault,
} from "@/lib/mail/mail";

export const runtime = "nodejs";

async function accountOrError() {
  const user = await getSessionFromCookies();
  if (!user) return { error: NextResponse.json({ error: "auth required" }, { status: 401 }) };
  const account = getAccountByUser(user.id);
  if (!account) return { error: NextResponse.json({ error: "no mail account" }, { status: 404 }) };
  if (account.status === "suspended") {
    return { error: NextResponse.json({ error: "Compte suspendu." }, { status: 403 }) };
  }
  return { account };
}

function asWrap(v: unknown, minIter: number): PassWrap | null {
  if (!v || typeof v !== "object") return null;
  const o = v as PassWrap;
  if (typeof o.salt !== "string" || typeof o.iv !== "string" || typeof o.ct !== "string") return null;
  if (o.salt.length > 80 || o.iv.length > 80 || o.ct.length < 20 || o.ct.length > 20_000) return null;
  if (!Number.isInteger(o.iterations) || o.iterations < minIter || o.iterations > 800_000) return null;
  return { salt: o.salt, iv: o.iv, ct: o.ct, iterations: o.iterations };
}

export async function GET() {
  const ctx = await accountOrError();
  if ("error" in ctx && ctx.error) return ctx.error;
  const account = ctx.account!;
  const vault = getVaultRecord(account.id);
  if (!vault) return NextResponse.json({ vault: null });
  await migrateLegacyToVault(account.id);
  return NextResponse.json({ vault });
}

export async function POST(req: Request) {
  const ctx = await accountOrError();
  if ("error" in ctx && ctx.error) return ctx.error;
  const account = ctx.account!;
  if (getVaultRecord(account.id)) {
    return NextResponse.json({ error: "Le coffre existe déjà." }, { status: 409 });
  }

  const body = (await req.json().catch(() => null)) as {
    ecdhPublic?: string;
    ecdsaPublic?: string;
    privWrap?: unknown;
    recoveryWrap?: unknown;
  } | null;

  const ecdhPublic = String(body?.ecdhPublic || "");
  const ecdsaPublic = String(body?.ecdsaPublic || "");
  const privWrap = asWrap(body?.privWrap, 600_000);
  const recoveryWrap = asWrap(body?.recoveryWrap, 120_000);
  if (!privWrap || !recoveryWrap || ecdhPublic.length < 80 || ecdsaPublic.length < 80) {
    return NextResponse.json({ error: "Coffre incomplet." }, { status: 400 });
  }
  if (ecdhPublic === ecdsaPublic) {
    return NextResponse.json({ error: "Clés de coffre invalides." }, { status: 400 });
  }
  try {
    await importPublic(ecdhPublic, "ECDH");
    await importPublic(ecdsaPublic, "ECDSA");
  } catch {
    return NextResponse.json({ error: "Clé publique illisible." }, { status: 400 });
  }

  const fingerprint = await fingerprintSpki(ecdhPublic);
  const saved = saveVault(account.id, {
    ecdhPublic,
    ecdsaPublic,
    privWrap,
    recoveryWrap,
    fingerprint,
  });
  if ("error" in saved) return NextResponse.json({ error: saved.error }, { status: 409 });
  await migrateLegacyToVault(account.id);
  return NextResponse.json({ ok: true, fingerprint });
}
