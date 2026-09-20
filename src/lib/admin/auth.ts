/**
 * Admin access guard.
 *
 * /admin requires a DEDICATED admin session (`ayeba_admin` cookie) issued
 * by /admin/connexion — a regular logged-in Ayeba account never suffices.
 * Lookup helpers and the section matrix live in ./access.ts.
 */

import { NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth-server";
import { getAdminSession } from "./session";
import { canAccessSection, isAdminEmail, type AdminSection } from "./access";
import type { AdminUser } from "./admin-types";

export {
  adminEmails,
  isAdminEmail,
  getAdminByUserId,
  canAccessSection,
  allowedSections,
  hasAdminPermission,
  SECTION_ROLES,
} from "./access";
export type { AdminSection } from "./access";

/**
 * Require an authenticated admin session. Returns { user, admin } or a
 * NextResponse to send back (401 unauthenticated, 403 suspended).
 */
export async function requireAdmin(): Promise<
  { user: SessionUser; admin: AdminUser | null } | NextResponse
> {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentification administrateur requise" },
      { status: 401 },
    );
  }
  return { user: session.user, admin: session.admin };
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
