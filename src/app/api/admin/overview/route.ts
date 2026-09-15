import { NextResponse } from "next/server";
import { adminOverview, listAdminStats, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin("admin");
  if ("error" in auth) return auth.error;
  return NextResponse.json({ stats: listAdminStats(), ...adminOverview() });
}
