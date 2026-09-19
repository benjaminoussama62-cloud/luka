import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adminCore } from "@/lib/admin/admin-core";
import { getDb } from "@/lib/storage/database";

export const runtime = "nodejs";

/** GET /api/admin/billing — financial overview + invoices + transactions. */
export async function GET() {
  const auth = await requireSection("billing");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const invoices = db
    .prepare("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200")
    .all();
  const transactions = db
    .prepare("SELECT * FROM transactions ORDER BY created_at DESC LIMIT 200")
    .all();
  const events = db
    .prepare("SELECT * FROM payment_events ORDER BY processed_at DESC LIMIT 100")
    .all();

  return NextResponse.json({
    ok: true,
    financial: adminCore.getFinancialOverview("month"),
    invoices,
    transactions,
    paymentEvents: events,
  });
}
