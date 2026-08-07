import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { DbUser } from "./db";
import { findUserByEmail, findUserById, getUsers, saveUsers } from "./db";
import { migrateAllUsersFromJson, syncUserToSqlite } from "./users-sqlite";

export const SESSION_COOKIE = "ayeba_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  provider: "email" | "google" | "github" | "microsoft" | "apple";
};

function secretKey() {
  const secret =
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "development" ? "ayeba-dev-secret-min-32-chars!!" : undefined);
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET manquant. Copie .env.example vers .env.local");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ sub: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function readSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await findUserById(payload.sub as string);
    if (!user) return null;
    return toSessionUser(user);
  } catch {
    return null;
  }
}

export function toSessionUser(u: DbUser): SessionUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarColor: u.avatarColor,
    provider: u.provider,
  };
}

export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionToken(token);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

const COLORS = ["#e85d04", "#ff6b35", "#64748b", "#94a3b8", "#f97316", "#78716c"];

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await findUserByEmail(email);
  if (existing) return { error: "Compte déjà existant." as const };

  const user: DbUser = {
    id: crypto.randomUUID(),
    name: name?.trim() || email.split("@")[0],
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password),
    avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    provider: "email",
    createdAt: new Date().toISOString(),
  };
  const users = await getUsers();
  await saveUsers([...users, user]);
  syncUserToSqlite(user);
  return { user: toSessionUser(user) };
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) return { error: "Identifiants invalides." as const };
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Identifiants invalides." as const };
  syncUserToSqlite(user);
  return { user: toSessionUser(user) };
}

export async function upsertOAuthUser(profile: {
  provider: DbUser["provider"];
  email: string;
  name: string;
  sub: string;
}) {
  const users = await getUsers();
  const email = profile.email.toLowerCase();
  let user = users.find((u) => u.email === email);
  const brandColors: Partial<Record<DbUser["provider"], string>> = {
    google: "#4285F4",
    github: "#24292f",
    microsoft: "#00A4EF",
    apple: "#555555",
  };
  if (!user) {
    user = {
      id: profile.sub || crypto.randomUUID(),
      name: profile.name,
      email,
      passwordHash: "",
      avatarColor: brandColors[profile.provider] ?? "#e85d04",
      provider: profile.provider,
      createdAt: new Date().toISOString(),
    };
    await saveUsers([...users, user]);
  } else {
    syncUserToSqlite(user);
  }
  return toSessionUser(user);
}

/** @deprecated use upsertOAuthUser */
export async function upsertGoogleUser(profile: {
  email: string;
  name: string;
  sub: string;
}) {
  return upsertOAuthUser({ ...profile, provider: "google" });
}
