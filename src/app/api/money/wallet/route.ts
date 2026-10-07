import { NextResponse } from "next/server";
import { requireMoneyUser, moneyError } from "@/lib/money/http";
import { getBalances, getOrCreateWallet, reconcileBalances } from "@/lib/money/core";
import { minorToMajorString } from "@/lib/money/amounts";
import { configuredProviders } from "@/lib/payments/registry";

export const runtime = "nodejs";

/**
 * GET /api/money/wallet — soldes + statut du portefeuille.
 * Le wallet est créé à la première visite (soldes à zéro, pas de PIN).
 */
export async function GET() {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;

  try {
    const wallet = await getOrCreateWallet(user.id);
    const balances = await getBalances(wallet.id);
    const integrity = await reconcileBalances(wallet.id);
    return NextResponse.json({
      wallet: {
        handle: wallet.handle ? `@${wallet.handle}` : null,
        status: wallet.status,
        hasPin: Boolean(wallet.pin_hash),
      },
      balances: {
        USD: { minor: balances.USD, display: minorToMajorString(balances.USD, "USD") },
        CDF: { minor: balances.CDF, display: minorToMajorString(balances.CDF, "CDF") },
      },
      providers: configuredProviders(),
      integrityOk: integrity.ok,
    });
  } catch (e) {
    return moneyError(e);
  }
}
