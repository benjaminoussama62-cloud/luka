import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { adminEmails } from "@/lib/admin/auth";
import { sendExternalMail } from "@/lib/mail/smtp";
import { audit, reconcileAll } from "@/lib/money/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET|POST /api/cron/money-reconcile — réconciliation globale du grand livre.
 *
 * Recalcule le solde de CHAQUE portefeuille depuis money_entries et le
 * compare au cache money_balances. Tout écart = bug ou manipulation → alerte
 * immédiate par email aux admins + audit (les soldes ne sont JAMAIS réparés
 * silencieusement — seule une transaction compensatoire auditée pourrait).
 * Signale aussi les transactions provider bloquées en 'pending'.
 * Idempotent : aucune écriture hors audit.
 */
async function run() {
  const startedAt = Date.now();
  const report = await reconcileAll({ stalePendingMin: 60 });
  const driftCount = report.drift.length;
  const staleCount = report.stalePending.length;

  await audit("", "", "cron_reconcile", {
    wallets: report.wallets,
    driftCount,
    staleCount,
    ms: Date.now() - startedAt,
  });

  if (driftCount > 0 || staleCount > 0) {
    const details = [
      `Portefeuilles contrôlés : ${report.wallets}`,
      `Écarts de solde détectés : ${driftCount}`,
      ...report.drift.slice(0, 20).map(
        (d) => `  - wallet ${d.walletId} (user ${d.userId}) : ${JSON.stringify(d.drift)}`,
      ),
      `Transactions provider en attente > 60 min : ${staleCount}`,
      ...report.stalePending.slice(0, 20).map(
        (t) => `  - ${t.id} (${t.kind} via ${t.provider ?? "?"}, depuis ${t.created_at})`,
      ),
    ];
    for (const email of [...adminEmails()].slice(0, 5)) {
      await sendExternalMail({
        from: "noreply@ayeba.app",
        fromName: "Ayeba Ops",
        to: email,
        subject: `[Ayeba Mbongo] Réconciliation : ${driftCount} écart(s), ${staleCount} pending(s)`,
        text: `Rapport de réconciliation du ${new Date().toISOString()}\n\n${details.join("\n")}\n\nAucune correction automatique n'a été appliquée — intervention requise.`,
      });
    }
    console.error("[money-reconcile] discrepancies:", driftCount, "stale:", staleCount);
  }

  return NextResponse.json({
    ok: driftCount === 0,
    walletsChecked: report.wallets,
    driftCount,
    stalePending: staleCount,
    drift: report.drift,
    stale: report.stalePending,
    ms: Date.now() - startedAt,
  });
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    return await run();
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return NextResponse.json({ ok: false, error: e.message }, { status: (e as { status: number }).status });
    }
    throw e;
  }
}

export async function POST(req: Request) {
  return GET(req);
}
