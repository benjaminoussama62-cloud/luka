import { NextResponse } from "next/server";
import { moneyError, requireMoneyUser } from "@/lib/money/http";
import { getOrCreateWallet, listTransactions } from "@/lib/money/core";
import { minorToMajorString } from "@/lib/money/amounts";

export const runtime = "nodejs";

/** GET /api/money/transactions?cursor=<entry_id> — historique paginé. */
export async function GET(req: Request) {
  const user = await requireMoneyUser();
  if (user instanceof NextResponse) return user;

  try {
    const wallet = await getOrCreateWallet(user.id);
    const cursor = Number(new URL(req.url).searchParams.get("cursor") || "") || undefined;
    const items = await listTransactions(wallet.id, 30, cursor);
    return NextResponse.json({
      transactions: items.map((t) => ({
        id: t.id,
        entryId: t.entry_id,
        kind: t.kind,
        status: t.status,
        direction: t.direction,
        currency: t.currency,
        amountMinor: t.amount_minor,
        amount: minorToMajorString(t.amount_minor, t.currency),
        provider: t.provider,
        createdAt: t.created_at,
        completedAt: t.completed_at,
      })),
      nextCursor: items.length === 30 ? items[items.length - 1].entry_id : null,
    });
  } catch (e) {
    return moneyError(e);
  }
}
