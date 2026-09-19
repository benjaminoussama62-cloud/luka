import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { adminCore } from "@/lib/admin/admin-core";
import { getDb } from "@/lib/storage/database";
import type { AdminRole } from "@/lib/admin/admin-types";

export const runtime = "nodejs";

const ROLES: AdminRole[] = ["super_admin", "manager", "support", "moderator", "analyst"];

function isSuperAdmin(admin: { role: string } | null) {
  return admin?.role === "super_admin";
}

/** GET /api/admin/admins — list admin team (super_admin only). */
export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { users } = adminCore.listAdminUsers({ limit: 200 });
  return NextResponse.json({ ok: true, admins: users, roles: ROLES });
}

/**
 * POST /api/admin/admins — manage admin team (super_admin only).
 * { action: "create", email, role, departments?, name? }
 * { action: "update", id, role?, status?, name?, departments? }
 * { action: "delete", id }
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  if (!auth.admin) {
    return NextResponse.json({ error: "compte admin non provisionné" }, { status: 409 });
  }
  if (!isSuperAdmin(auth.admin)) {
    return NextResponse.json({ error: "Réservé au super_admin" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { action, id, email, role, status, name, departments } = (body ?? {}) as {
    action?: string;
    id?: string;
    email?: string;
    role?: string;
    status?: string;
    name?: string;
    departments?: string[];
  };

  if (action === "create") {
    if (!email || !role || !ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ error: "email et rôle valide requis" }, { status: 400 });
    }
    const user = getDb()
      .prepare("SELECT id, name FROM users WHERE email = ?")
      .get(email.trim().toLowerCase()) as { id: string; name: string } | undefined;
    if (!user) {
      return NextResponse.json(
        { error: "Aucun compte utilisateur avec cet email — la personne doit d'abord créer un compte Ayeba" },
        { status: 409 },
      );
    }
    if (adminCore.getAdminByUserId(user.id)) {
      return NextResponse.json({ error: "Cet utilisateur est déjà admin" }, { status: 409 });
    }
    const created = adminCore.createAdminUser({
      userId: user.id,
      name: name?.trim() || user.name,
      email: email.trim().toLowerCase(),
      role: role as AdminRole,
      departments: departments ?? [],
    });
    return NextResponse.json({ ok: true, admin: created });
  }

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }
  const target = adminCore.getAdminUser(id);
  if (!target) return NextResponse.json({ error: "admin introuvable" }, { status: 404 });

  // Never let the last active super_admin be demoted/removed/suspended.
  const targetIsLastSuper =
    target.role === "super_admin" &&
    adminCore
      .listAdminUsers({ role: "super_admin", status: "active", limit: 10 })
      .users.filter((a) => a.id !== id).length === 0;
  const wouldLoseSuper =
    (action === "delete") ||
    (action === "update" && ((role && role !== "super_admin") || status === "suspended"));
  if (targetIsLastSuper && wouldLoseSuper) {
    return NextResponse.json(
      { error: "Impossible : c'est le dernier super_admin actif" },
      { status: 409 },
    );
  }

  if (action === "update") {
    if (role && !ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ error: "rôle invalide" }, { status: 400 });
    }
    if (status && !["active", "suspended", "pending"].includes(status)) {
      return NextResponse.json({ error: "statut invalide" }, { status: 400 });
    }
    const updated = adminCore.updateAdminUser(id, {
      name,
      role: role as AdminRole | undefined,
      status,
      departments,
    });
    return NextResponse.json({ ok: true, admin: updated });
  }

  if (action === "delete") {
    adminCore.deleteAdminUser(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action invalide" }, { status: 400 });
}
