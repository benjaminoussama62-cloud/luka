import { getDb } from "@/lib/storage/database";
import { getSessionFromCookies, hashPassword } from "@/lib/auth-server";
import type { SessionUser } from "@/lib/auth-server";

export type AdminRole = "moderator" | "admin" | "superadmin" | "support";
const PRIVILEGE: Record<AdminRole, number> = { support: 1, moderator: 2, admin: 3, superadmin: 4 };

export async function requireAdmin(minimum: AdminRole = "admin") {
  const user = await getSessionFromCookies();
  if (!user || !isAllowed(user, minimum)) return { error: new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: { "content-type": "application/json" } }) };
  return { user };
}

export function isAllowed(user: SessionUser, minimum: AdminRole) {
  return user.role in PRIVILEGE && PRIVILEGE[user.role as AdminRole] >= PRIVILEGE[minimum];
}

export function adminOverview() {
  const db = getDb();
  const users = db.prepare("SELECT id, name, email, provider, role, created_at as createdAt FROM users ORDER BY created_at DESC").all();
  const tickets = db.prepare("SELECT id, user_id as userId, email, subject, message, status, priority, assigned_to as assignedTo, created_at as createdAt, updated_at as updatedAt FROM support_tickets ORDER BY created_at DESC LIMIT 200").all();
  const audit = db.prepare("SELECT id, actor_id as actorId, action, target_type as targetType, target_id as targetId, detail, ip, created_at as createdAt FROM admin_audit_log ORDER BY created_at DESC LIMIT 200").all();
  return { users, tickets, audit };
}

export async function createManagedUser(input: { actor: SessionUser; name: string; email: string; password: string; role: AdminRole; ip?: string }) {
  if (!isAllowed(input.actor, "superadmin")) throw new Error("Seul un super administrateur peut créer un responsable.");
  if (input.password.length < 16) throw new Error("Le mot de passe doit contenir au moins 16 caractères.");
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(input.email);
  if (existing) throw new Error("Un compte existe déjà avec cet email.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at) VALUES (?, ?, ?, ?, ?, 'email', ?, ?)").run(
    id, input.name.trim(), input.email.trim().toLowerCase(), await hashPassword(input.password), "#e85d04", input.role, now,
  );
  auditAdminAction(input.actor, "user.created", "user", id, `role=${input.role}`, input.ip);
  return { id, name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, createdAt: now };
}

export function changeManagedUserRole(actor: SessionUser, targetId: string, role: AdminRole, ip?: string) {
  if (!isAllowed(actor, "superadmin")) throw new Error("Seul un super administrateur peut modifier les rôles.");
  const target = getDb().prepare("SELECT role FROM users WHERE id = ?").get(targetId) as { role: string } | undefined;
  if (!target) return false;
  if (target.role === "superadmin" && role !== "superadmin") throw new Error("Le dernier compte superadmin ne peut pas être rétrogradé par cette opération.");
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, targetId);
  auditAdminAction(actor, "user.role_changed", "user", targetId, `role=${role}`, ip);
  return true;
}

export function auditAdminAction(actor: SessionUser, action: string, targetType = "", targetId = "", detail = "", ip?: string) {
  getDb().prepare("INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    actor.id, action, targetType, targetId, detail, ip || null, new Date().toISOString(),
  );
}

export function listAdminStats() {
  const db = getDb();
  return {
    users: (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count,
    articles: (db.prepare("SELECT COUNT(*) as count FROM ayebi_articles").get() as { count: number }).count,
    applications: (db.prepare("SELECT COUNT(*) as count FROM oauth_clients").get() as { count: number }).count,
    openTickets: (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('open', 'pending')").get() as { count: number }).count,
  };
}
