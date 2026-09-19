/**
 * Admin access guard — an admin is a session user who either has an
 * active row in admin_users or is listed in AYEBA_ADMIN_EMAILS.
 */

import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/storage/database";
import type { AdminUser } from "./admin-types";

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.AYEBA_ADMIN_EMAILS || process.env.AYEBA_OAUTH_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string): boolean {
  return adminEmails().has(email.toLowerCase());
}

/** Active admin_users row for this user id, if any. */
export function getAdminByUserId(userId: string): AdminUser | null {
  const row = getDb()
    .prepare("SELECT * FROM admin_users WHERE user_id = ? AND status = 'active'")
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as AdminUser["role"],
    permissions: JSON.parse((row.permissions as string) || "[]"),
    departments: JSON.parse((row.departments as string) || "[]"),
    createdAt: row.created_at as string,
    lastLoginAt: (row.last_login_at as string) || "",
    status: row.status as AdminUser["status"],
  };
}

/**
 * Require an authenticated admin. Returns { user, admin } or a
 * NextResponse to send back (401 unauthenticated, 403 not admin).
 * `admin` is null for env-listed admins without an admin_users row.
 */
export async function requireAdmin(): Promise<
  { user: SessionUser; admin: AdminUser | null } | NextResponse
> {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const admin = getAdminByUserId(user.id);
  if (!admin && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  return { user, admin };
}
