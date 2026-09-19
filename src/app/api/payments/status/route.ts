import { NextResponse } from "next/server";
import { requireStudioUser } from "@/lib/studio/http";
import { paymentsStatus } from "@/lib/payments/registry";

export const runtime = "nodejs";

/**
 * GET /api/payments/status — which payment providers have live
 * credentials configured. Never exposes key material.
 */
export async function GET() {
  const user = await requireStudioUser();
  if (user instanceof NextResponse) return user;
  return NextResponse.json(paymentsStatus());
}
