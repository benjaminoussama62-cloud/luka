/**
 * Dedicated back-office authentication.
 *
 * Admin access is deliberately separated from the normal user session:
 * a regular `ayeba_session` cookie NEVER grants /admin access. Admins
 * authenticate through /admin/connexion (password + TOTP when enabled),
 * which issues a short-lived `ayeba_admin` JWT bound to a revocable
 * admin_sessions row. Every attempt is rate-limited and audit-logged.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb } from "@/lib/storage/database";
import { findUserByEmail, findUserById } from "@/lib/db";
import { verifyPassword, toSessionUser, type SessionUser } from "@/lib/auth-server";
import { verifyUserTotp, userRequiresTotp } from "@/lib/security/user-security";
import { getAdminByUserId, isAdminEmail } from "./access";
import type { AdminUser } from "./admin-types";

export const ADMIN_COOKIE = "ayeba_admin";
const ADMIN_SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MIN = 15;

function adminSecret() {
  const secret =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "ayeba-dev-secret-min-32-chars!!" : undefined);
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET manquant");
  return new TextEncoder().encode(`${secret}:ayeba-admin`);
}

type AdminSessionRow = {
  id: string;
  admin_id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

function recordAttempt(email: string, ip: string, success: boolean, detail = "") {
  try {
    getDb()
      .prepare(
        "INSERT INTO admin_login_attempts (email, ip, success, detail, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(email.toLowerCase(), ip, success ? 1 : 0, detail, new Date().toISOString());
  } catch {
    /* audit best-effort */
  }
}

/** True when too many recent failures — brute-force lockout. */
function isLockedOut(email: string, ip: string): boolean {
  const since = new Date(Date.now() - LOCK_WINDOW_MIN * 60_000).toISOString();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM admin_login_attempts
       WHERE success = 0 AND created_at >= ? AND (email = ? OR ip = ?)`,
    )
    .get(since, email.toLowerCase(), ip) as { c: number };
  return row.c >= MAX_ATTEMPTS;
}

function audit(adminId: string, adminName: string, action: string, ip: string, ua: string, detail = "{}") {
  try {
    getDb()
      .prepare(
        `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, ip_address, user_agent, timestamp)
         VALUES (?, ?, ?, ?, 'admin_session', ?, ?, ?, ?, ?)`,
      )
      .run(crypto.randomUUID(), adminId, adminName, action, adminId, detail, ip, ua, new Date().toISOString());
  } catch {
    /* audit best-effort */
  }
}

/**
 * First-login bootstrap: an env-listed email (AYEBA_ADMIN_EMAILS) gets a
 * super_admin row — but ONLY after the password (and 2FA) check passed.
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
    audit(id, user.name, "env_bootstrap_admin", "", "");
    return getAdminByUserId(user.id);
  } catch (e) {
    console.error("[admin] env bootstrap failed", e);
    return null;
  }
}

export type AdminLoginResult =
  | { ok: true; token: string; admin: AdminUser; user: SessionUser }
  | { ok: false; error: string; totpRequired?: boolean };

/** Full admin login: rate-limit → password → admin rights → 2FA → session. */
export async function adminLogin(input: {
  email: string;
  password: string;
  totpCode?: string;
  ip: string;
  userAgent: string;
}): Promise<AdminLoginResult> {
  const email = input.email.trim().toLowerCase();
  const generic = "Identifiants invalides ou accès non autorisé.";

  if (isLockedOut(email, input.ip)) {
    recordAttempt(email, input.ip, false, "lockout");
    return { ok: false, error: "Trop de tentatives. Réessaie dans 15 minutes." };
  }

  const dbUser = await findUserByEmail(email);
  const passwordOk = dbUser
    ? await verifyPassword(input.password, dbUser.passwordHash)
    : false;
  if (!dbUser || !passwordOk) {
    recordAttempt(email, input.ip, false, "bad_credentials");
    return { ok: false, error: generic };
  }

  const user = toSessionUser(dbUser);
  let admin = getAdminByUserId(user.id);
  if (!admin && !isAdminEmail(email)) {
    // A normal Ayeba account is NEVER enough for the back office.
    recordAttempt(email, input.ip, false, "not_admin");
    return { ok: false, error: generic };
  }
  if (!admin) admin = provisionEnvAdmin(user);
  if (!admin || admin.status !== "active") {
    recordAttempt(email, input.ip, false, "admin_inactive");
    return { ok: false, error: generic };
  }

  // 2FA: mandatory whenever the account has TOTP enabled.
  if (userRequiresTotp(user.id)) {
    if (!input.totpCode) {
      return { ok: false, error: "Code de vérification requis.", totpRequired: true };
    }
    if (!verifyUserTotp(user.id, input.totpCode)) {
      recordAttempt(email, input.ip, false, "bad_totp");
      return { ok: false, error: "Code de vérification invalide.", totpRequired: true };
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_HOURS * 3600_000).toISOString();
  const sessionId = crypto.randomUUID();
  const db = getDb();
  db.prepare(
    `INSERT INTO admin_sessions (id, admin_id, user_id, ip, user_agent, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(sessionId, admin.id, user.id, input.ip, input.userAgent.slice(0, 300), now.toISOString(), expiresAt);
  db.prepare("UPDATE admin_users SET last_login_at = ? WHERE id = ?").run(now.toISOString(), admin.id);

  const token = await new SignJWT({ aid: admin.id, sid: sessionId, role: admin.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setAudience("ayeba-admin")
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(adminSecret());

  recordAttempt(email, input.ip, true);
  audit(admin.id, admin.name, "admin_login", input.ip, input.userAgent.slice(0, 300));
  return { ok: true, token, admin, user };
}

/** Resolve the current admin session from the ayeba_admin cookie. */
export async function getAdminSession(): Promise<{
  admin: AdminUser;
  user: SessionUser;
  sessionId: string;
} | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  let payload: { sub?: string; aid?: string; sid?: string };
  try {
    const { payload: p } = await jwtVerify(token, adminSecret(), { audience: "ayeba-admin" });
    payload = p;
  } catch {
    return null;
  }
  if (!payload.sub || !payload.aid || !payload.sid) return null;

  const session = getDb()
    .prepare("SELECT * FROM admin_sessions WHERE id = ?")
    .get(payload.sid) as AdminSessionRow | undefined;
  if (!session || session.revoked_at) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) return null;

  const admin = getAdminByUserId(payload.sub);
  if (!admin || admin.id !== payload.aid) return null;

  const dbUser = await findUserById(payload.sub);
  if (!dbUser) return null;
  return { admin, user: toSessionUser(dbUser), sessionId: session.id };
}

export async function revokeAdminSession(sessionId: string) {
  try {
    getDb()
      .prepare("UPDATE admin_sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
      .run(new Date().toISOString(), sessionId);
  } catch {
    /* best-effort */
  }
}

export async function setAdminCookie(token: string) {
  const jar = await cookies();
  const secure =
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") === true;
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export function listAdminSessions(adminId?: string) {
  const db = getDb();
  const base = `SELECT s.id, s.admin_id, s.ip, s.user_agent, s.created_at, s.expires_at, s.revoked_at,
      a.name AS admin_name, a.email AS admin_email
      FROM admin_sessions s LEFT JOIN admin_users a ON a.id = s.admin_id`;
  const order = " ORDER BY s.created_at DESC LIMIT 100";
  return (
    adminId
      ? db.prepare(`${base} WHERE s.admin_id = ?${order}`).all(adminId)
      : db.prepare(`${base}${order}`).all()
  ) as Record<string, unknown>[];
}

export function listLoginAttempts(limit = 100) {
  return getDb()
    .prepare(
      "SELECT email, ip, success, detail, created_at FROM admin_login_attempts ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as Record<string, unknown>[];
}
