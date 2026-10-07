import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import {
  audit,
  getWalletById,
  getWalletByUserId,
  listWallets,
  normalizeHandle,
  setWalletStatus,
} from "@/lib/money/core";
import { minorToMajorString } from "@/lib/money/amounts";
import { moneyDb } from "@/lib/money/db";
import { moneyError } from "@/lib/money/http";

export const runtime = "nodejs";

/**
 * GET /api/admin/money — liste des portefeuilles (sans aucun secret).
 * Paramètres : ?status=frozen|active, ?q=handle/userId, ?audit=1
 */
export async function GET(req: Request) {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  try {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") || "").trim();
  const wallets = await listWallets(300);
  const filtered = wallets.filter(
    (w) =>
      (!status || w.status === status) &&
      (!q ||
        w.handle === normalizeHandle(q) ||
        w.user_id === q ||
        w.id === q),
  );

  const out: Record<string, unknown> = {
    ok: true,
    wallets: filtered.map((w) => ({
      id: w.id,
      userId: w.user_id,
      handle: w.handle ? `@${w.handle}` : null,
      status: w.status,
      hasPin: Boolean(w.pin_hash),
      createdAt: w.created_at,
      balances: {
        USD: { minor: w.balances.USD, display: minorToMajorString(w.balances.USD, "USD") },
        CDF: { minor: w.balances.CDF, display: minorToMajorString(w.balances.CDF, "CDF") },
      },
    })),
  };
  if (url.searchParams.get("audit") === "1") {
    const db = await moneyDb();
    out.recentAudit = await db.all(
      "SELECT user_id, wallet_id, action, detail, ip, created_at FROM money_audit ORDER BY id DESC LIMIT 100",
    );
  }
  return NextResponse.json(out);
  } catch (e) {
    return moneyError(e);
  }
}

/**
 * POST /api/admin/money — gel / dégel d'un portefeuille.
 * Body: {walletId | userId | "@handle", action:"freeze"|"unfreeze"|"close", reason}
 * Un wallet gelé ne peut plus rien déplacer : transferts, dépôts, retraits.
 */
export async function POST(req: Request) {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  let body: {
    walletId?: string;
    userId?: string;
    handle?: string;
    action?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const action = body.action === "freeze" ? "frozen" : body.action === "unfreeze" ? "active" : body.action === "close" ? "closed" : null;
  if (!action) {
    return NextResponse.json({ error: "action ∈ freeze | unfreeze | close" }, { status: 400 });
  }
  if (action !== "active" && !body.reason?.trim()) {
    return NextResponse.json({ error: "Un motif est obligatoire pour geler ou fermer" }, { status: 400 });
  }

  try {
  // Cible : walletId, userId ou @handle.
  let wallet = body.walletId
    ? await getWalletById(body.walletId)
    : body.userId
      ? await getWalletByUserId(body.userId)
      : null;
  if (!wallet && body.handle) {
    const db = await moneyDb();
    const row = (await db.get("SELECT * FROM money_wallets WHERE handle = ?", [
      normalizeHandle(body.handle),
    ])) as { id: string } | undefined;
    wallet = row ? await getWalletById(row.id) : null;
  }
  if (!wallet) {
    return NextResponse.json({ error: "Portefeuille introuvable" }, { status: 404 });
  }

  const updated = await setWalletStatus(wallet.id, action, body.reason?.trim());
  await audit(auth.user.id, wallet.id, `admin_${body.action}`, {
    targetUser: wallet.user_id,
    reason: body.reason?.trim() || null,
    admin: auth.user.email,
  });

  return NextResponse.json({
    ok: true,
    wallet: { id: updated.id, userId: updated.user_id, status: updated.status },
  });
  } catch (e) {
    return moneyError(e);
  }
}
