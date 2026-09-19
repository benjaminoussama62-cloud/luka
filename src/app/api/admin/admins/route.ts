import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
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
  const auth = await requireSection("team");
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
  const auth = await requireSection("team");
  if (auth instanceof NextResponse) return auth;
  if (!auth.admin || !isSuperAdmin(auth.admin)) {
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
    const db = getDb();
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // The super_admin hands the password to the person — a fresh one is
    // generated on every provisioning (existing passwords are replaced).
    const temporaryPassword = `Ayeba-${randomBytes(9).toString("base64url")}!${randomBytes(2).toString("hex")}`;
    const hash = bcrypt.hashSync(temporaryPassword, 12);

    let user = db
      .prepare("SELECT id, name FROM users WHERE email = ?")
      .get(cleanEmail) as { id: string; name: string } | undefined;
    if (!user) {
      const uid = randomUUID();
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
         VALUES (?, ?, ?, ?, '#e85d04', 'email', 'contributor', ?)`,
      ).run(uid, name?.trim() || cleanEmail.split("@")[0], cleanEmail, hash, now);
      user = { id: uid, name: name?.trim() || cleanEmail.split("@")[0] };
    } else {
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
    }

    if (adminCore.getAdminByUserId(user.id)) {
      return NextResponse.json({ error: "Cet utilisateur est déjà admin" }, { status: 409 });
    }
    const created = adminCore.createAdminUser({
      userId: user.id,
      name: name?.trim() || user.name,
      email: cleanEmail,
      role: role as AdminRole,
      departments: departments ?? [],
    });
    // Returned once — the super_admin transmits it to the new admin.
    return NextResponse.json({ ok: true, admin: created, temporaryPassword });
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
