import type { DbUser } from "./db";
import type { AyebiRole } from "./ayebi/db-sqlite";
import { roleFromUser } from "./ayebi/permissions";
import { adb } from "./storage/adb";

/**
 * Synchronisation best-effort — fire-and-forget volontaire : un échec de
 * cette copie ne doit jamais bloquer un login. L'appelant n'a pas à await.
 */
export function syncUserToSqlite(user: DbUser, role: AyebiRole = "contributor") {
  void adb()
    .run(
      `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name=excluded.name, email=excluded.email, avatar_color=excluded.avatar_color, provider=excluded.provider`,
      [
        user.id,
        user.name?.trim() || user.email.split("@")[0],
        user.email,
        user.passwordHash,
        user.avatarColor,
        user.provider,
        role,
        user.createdAt,
      ],
    )
    .catch((e) => console.warn("[users] sync failed:", (e as Error).message));
}

export async function getUserRole(userId: string): Promise<AyebiRole> {
  const row = (await adb().get("SELECT role FROM users WHERE id = ?", [userId])) as
    | { role: string }
    | undefined;
  return roleFromUser(row ?? null);
}

export async function migrateAllUsersFromJson() {
  const { getUsers } = await import("./db");
  const users = await getUsers();
  const d = adb();
  await d.transaction(async (tx) => {
    for (const u of users) {
      await tx.run(
        `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, email=excluded.email, avatar_color=excluded.avatar_color, provider=excluded.provider`,
        [
          u.id,
          u.name?.trim() || u.email.split("@")[0],
          u.email,
          u.passwordHash,
          u.avatarColor,
          u.provider,
          "contributor",
          u.createdAt,
        ],
      );
    }
  });
}
