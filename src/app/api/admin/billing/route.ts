import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adminCore } from "@/lib/admin/admin-core";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

/** GET /api/admin/billing — financial overview + invoices + transactions. */
export async function GET() {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  const db = adb();
  const invoices = await db.all("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200");
  const transactions = await db.all("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200");
  const events = await db.all("SELECT * FROM payment_events ORDER BY processed_at DESC LIMIT 100");

  return NextResponse.json({
    ok: true,
    financial: adminCore.getFinancialOverview("month"),
    invoices,
    transactions,
    paymentEvents: events,
  });
}
