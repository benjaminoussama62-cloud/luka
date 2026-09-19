/**
 * Admin access guard — an admin is a session user who either has an
 * active row in admin_users or is listed in AYEBA_ADMIN_EMAILS.
 */

import { NextResponse } from "next/server";
import { getSessionFromCookies, type SessionUser } from "@/lib/auth-server";
import { getDb } from "@/lib/storage/database";
import type { AdminRole, AdminUser } from "./admin-types";

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
 * First-login bootstrap: an env-listed email (AYEBA_ADMIN_EMAILS) with no
 * admin_users row gets a super_admin row provisioned automatically, so
 * every mutation route (which requires a real row for FK integrity) works
 * without a manual CLI step against the production database.
 */
function provisionEnvAdmin(user: SessionUser): AdminUser | null {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    db.prepare(
      `INSERT INTO admin_users (id, user_id, name, email, role, permissions, departments, created_at, last_login_at, status)
       VALUES (?, ?, ?, ?, 'super_admin', '["all"]', '["*"]', ?, ?, 'active')`,
    ).run(id, user.id, user.name, user.email.toLowerCase(), now, now);
    db.prepare(
      `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
       VALUES (?, ?, ?, 'env_bootstrap_admin', 'admin_user', ?, '{}', ?)`,
    ).run(crypto.randomUUID(), id, user.name, id, now);
    return getAdminByUserId(user.id);
  } catch (e) {
    console.error("[admin] env bootstrap failed", e);
    return null;
  }
}

/**
 * Require an authenticated admin. Returns { user, admin } or a
 * NextResponse to send back (401 unauthenticated, 403 not admin).
 */
export async function requireAdmin(): Promise<
  { user: SessionUser; admin: AdminUser | null } | NextResponse
> {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  let admin = getAdminByUserId(user.id);
  if (!admin && !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }
  if (!admin) admin = provisionEnvAdmin(user);
  return { user, admin };
}

/* ---------- section-level authorization ---------- */

export type AdminSection =
  | "overview"
  | "users"
  | "moderation"
  | "support"
  | "billing"
  | "network"
  | "content"
  | "audit"
  | "team"
  | "chat";

/** Which back-office sections each role may open. super_admin sees all. */
export const SECTION_ROLES: Record<AdminSection, AdminRole[]> = {
  overview: ["super_admin", "manager", "support", "moderator", "analyst"],
  users: ["super_admin"],
  moderation: ["super_admin", "manager", "moderator", "support"],
  support: ["super_admin", "manager", "support"],
  billing: ["super_admin", "manager"],
  network: ["super_admin", "manager"],
  content: ["super_admin", "manager", "moderator"],
  audit: ["super_admin"],
  team: ["super_admin"],
  chat: ["super_admin", "manager", "support", "moderator", "analyst"],
};

/** Effective role: provisioned admin role, or super_admin for env-listed admins. */
function effectiveRole(admin: AdminUser | null, envListed: boolean): AdminRole | null {
  if (admin) return admin.role;
  return envListed ? "super_admin" : null;
}

export function canAccessSection(admin: AdminUser | null, envListed: boolean, section: AdminSection): boolean {
  const role = effectiveRole(admin, envListed);
  return role !== null && SECTION_ROLES[section].includes(role);
}

/** Sections visible to this admin — drives the sidebar. */
export function allowedSections(admin: AdminUser | null, envListed: boolean): AdminSection[] {
  return (Object.keys(SECTION_ROLES) as AdminSection[]).filter((s) =>
    canAccessSection(admin, envListed, s),
  );
}

/** True when the admin may perform write actions (approve/reject/reply). */
export function hasAdminPermission(admin: AdminUser | null, envListed: boolean, permission: string): boolean {
  if (envListed && !admin) return true; // env-listed = super_admin
  if (!admin) return false;
  return admin.permissions.includes("all") || admin.permissions.includes(permission);
}

/** requireAdmin + section authorization. Returns auth or an error response. */
export async function requireSection(
  section: AdminSection,
): Promise<{ user: SessionUser; admin: AdminUser | null; envListed: boolean } | NextResponse> {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const envListed = isAdminEmail(auth.user.email);
  if (!canAccessSection(auth.admin, envListed, section)) {
    return NextResponse.json({ error: "Section non autorisée pour ton rôle" }, { status: 403 });
  }
  return { ...auth, envListed };
}
