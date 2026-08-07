import type { DbUser } from "./db";
import type { AyebiRole } from "./ayebi/db-sqlite";
import { roleFromUser } from "./ayebi/permissions";
import { getDb } from "./storage/database";

export function syncUserToSqlite(user: DbUser, role: AyebiRole = "contributor") {
  getDb()
    .prepare(
      `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, email=excluded.email, avatar_color=excluded.avatar_color, provider=excluded.provider`,
    )
    .run(
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.avatarColor,
      user.provider,
      role,
      user.createdAt,
    );
}

export function getUserRole(userId: string): AyebiRole {
  const row = getDb().prepare("SELECT role FROM users WHERE id = ?").get(userId) as
    | { role: string }
    | undefined;
  return roleFromUser(row ?? null);
}

export async function migrateAllUsersFromJson() {
  const { getUsers } = await import("./db");
  const users = await getUsers();
  for (const u of users) syncUserToSqlite(u);
}
