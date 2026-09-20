/**
 * Admin access helpers — pure lookup + role/section matrix.
 * No session handling here (see ./session.ts and ./auth.ts).
 */

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

/* ---------- section-level authorization ---------- */

export type AdminSection =
  | "overview"
  | "users"
  | "moderation"
  | "support"
  | "billing"
  | "network"
  | "content"
  | "search"
  | "ecosystem"
  | "security"
  | "system"
  | "audit"
  | "team"
  | "chat"
  | "broadcast"
  | "incidents";

/** Which back-office sections each role may open. super_admin sees all. */
export const SECTION_ROLES: Record<AdminSection, AdminRole[]> = {
  overview: ["super_admin", "manager", "support", "moderator", "analyst"],
  users: ["super_admin"],
  moderation: ["super_admin", "manager", "moderator", "support"],
  support: ["super_admin", "manager", "support"],
  billing: ["super_admin", "manager"],
  network: ["super_admin", "manager"],
  content: ["super_admin", "manager", "moderator"],
  search: ["super_admin", "manager", "analyst"],
  ecosystem: ["super_admin", "manager"],
  security: ["super_admin"],
  system: ["super_admin", "manager", "analyst"],
  audit: ["super_admin"],
  team: ["super_admin"],
  chat: ["super_admin", "manager", "support", "moderator", "analyst"],
  broadcast: ["super_admin", "manager"],
  incidents: ["super_admin", "manager"],
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
