/**
 * Ayeba Money — orchestration des providers externes (dépôt / retrait).
 *
 * Le ledger ne connaît aucun provider : il ne voit que des transactions
 * pending → completed/failed/reversed. Ici on traduit une intention Money
 * en appels PaymentProvider (CinetPay/Flutterwave aujourd'hui, Flash dès
 * que le SA livre les credentials — providerForMethod le choisit).
 *
 * Règle d'or : l'appel réseau se fait HORS de toute transaction SQLite.
 */
import { providerForMethod } from "@/lib/payments/registry";
import type { PaymentProvider } from "@/lib/payments/types";
import { siteBaseUrl } from "@/lib/site-url";
import { minorToMajor } from "./amounts";
import {
  attachProviderToTx,
  failPendingTx,
  reverseWithdrawal,
  type MoneyTransaction,
} from "./core";

/** Provider mobile-money le mieux configuré (Flash > CinetPay > Flutterwave). */
export function moneyProvider(): PaymentProvider {
  return providerForMethod("mobile_money");
}

/**
 * Dépôt : la transaction pending existe déjà (créée par createDepositIntent).
 * On demande la charge au provider puis on stocke sa référence. Le crédit
 * réel n'arrive QUE via reconcileMoneyWebhook() après signature vérifiée.
 */
export async function startDepositCharge(tx: MoneyTransaction, input: {
  userEmail: string;
  userName: string;
  phone: string;
}): Promise<MoneyTransaction> {
  try {
    // PaymentNotConfiguredError compris : la transaction pending doit être
    // soldée 'failed' dans TOUS les cas d'échec — jamais de pending orphelin.
    const provider = moneyProvider();
    const result = await provider.createCharge({
      transactionId: tx.id,
      amount: minorToMajor(tx.amount_minor, tx.currency),
      currency: tx.currency,
      description: "Dépôt Ayeba Money",
      customerEmail: input.userEmail,
      customerName: input.userName,
      customerPhone: input.phone,
      returnUrl: `${siteBaseUrl()}/money?deposit=${tx.id}`,
      notifyUrl: `${siteBaseUrl()}/api/money/webhooks/${provider.name}`,
    });
    await attachProviderToTx(tx.id, provider.name, result.providerRef, result.checkoutUrl);
    return { ...tx, provider: provider.name, checkout_url: result.checkoutUrl };
  } catch (e) {
    await failPendingTx(tx.id, (e as Error).message || "provider error");
    throw e;
  }
}

/**
 * Retrait : le montant est déjà débité (hold, transaction pending).
 * Échec immédiat du provider → reversal automatique ; succès → on attend
 * le webhook qui tranchera completed/failed (+reversal).
 */
export async function startWithdrawalPayout(tx: MoneyTransaction, input: {
  phone: string;
  network?: string;
}): Promise<MoneyTransaction> {
  try {
    // Idem : provider non configuré → le hold est reversé immédiatement.
    const provider = moneyProvider();
    const result = await provider.createPayout({
      transactionId: tx.id,
      amount: minorToMajor(tx.amount_minor, tx.currency),
      currency: tx.currency,
      description: "Retrait Ayeba Money",
      destination: { method: "mobile_money", phone: input.phone, network: input.network },
    });
    await attachProviderToTx(tx.id, provider.name, result.providerRef);
    return { ...tx, provider: provider.name };
  } catch (e) {
    await reverseWithdrawal(tx.id, (e as Error).message || "provider error");
    throw e;
  }
}
