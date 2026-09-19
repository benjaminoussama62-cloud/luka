import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminDashboard } from "@/lib/admin/admin-dashboard";
import type { AdminUser } from "@/lib/admin/admin-types";

export const runtime = "nodejs";

/** GET /api/admin/dashboard — aggregated back-office dashboard. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const admin: AdminUser =
    auth.admin ??
    ({
      id: `env:${auth.user.id}`,
      userId: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: "super_admin",
      permissions: ["*"],
      departments: ["*"],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      status: "active",
    } satisfies AdminUser);

  const data = await adminDashboard.getMainDashboard(admin);
  return NextResponse.json({ ok: true, admin, ...data });
}
