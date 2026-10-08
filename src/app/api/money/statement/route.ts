import { NextResponse } from "next/server";
import { requireMoneyUser, moneyError } from "@/lib/money/http";
import { getOrCreateWallet, listStatementEntries } from "@/lib/money/core";
import { minorToMajorString } from "@/lib/money/amounts";

export const runtime = "nodejs";

const KIND_LABEL: Record<string, string> = {
  transfer: "Transfert",
  deposit: "Dépôt",
  withdrawal: "Retrait",
  reversal: "Recrédit",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "En cours",
  completed: "Confirmé",
  failed: "Échoué",
  reversed: "Remboursé",
};

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/money/statement — relevé CSV de toutes les écritures du wallet.
 * Séparateur ";" (Excel fr), UTF-8 avec BOM.
 */
export async function GET() {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;

  try {
    const wallet = await getOrCreateWallet(user.id);
    const entries = await listStatementEntries(wallet.id);

    const lines = [
      ["Date", "Référence", "Type", "Statut", "Sens", "Montant", "Devise", "Solde après", "Contrepartie"].join(";"),
    ];
    for (const e of entries) {
      const direction = e.delta_minor > 0 ? "Crédit" : "Débit";
      lines.push(
        [
          e.entry_at,
          e.provider_ref || e.id,
          KIND_LABEL[e.kind] ?? e.kind,
          STATUS_LABEL[e.status] ?? e.status,
          direction,
          minorToMajorString(Math.abs(e.delta_minor), e.currency as "USD" | "CDF"),
          e.currency,
          minorToMajorString(e.balance_after_minor, e.currency as "USD" | "CDF"),
          e.counterparty || e.provider || "",
        ]
          .map(csvCell)
          .join(";"),
      );
    }

    const csv = "﻿" + lines.join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ayeba-money-releve-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return moneyError(e);
  }
}
