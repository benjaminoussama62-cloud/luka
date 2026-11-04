import bcrypt from "bcryptjs";
import { adb } from "@/lib/storage/adb";
import { generateBackupCodes, generateTotpSecret, verifyTotp } from "./totp";

type SecurityRow = {
  user_id: string;
  totp_secret: string | null;
  totp_enabled: number;
  backup_codes_json: string;
  updated_at: string;
};

const SELECT_ROW = "SELECT * FROM user_security WHERE user_id = ?";

export async function getUserSecurity(userId: string) {
  const r = (await adb().get(SELECT_ROW, [userId])) as SecurityRow | undefined;
  if (!r) return { totpEnabled: false, hasPendingSetup: false };
  return {
    totpEnabled: r.totp_enabled === 1,
    hasPendingSetup: Boolean(r.totp_secret) && r.totp_enabled !== 1,
  };
}

export async function beginTotpSetup(userId: string) {
  const db = adb();
  const secret = generateTotpSecret();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO user_security (user_id, totp_secret, totp_enabled, backup_codes_json, updated_at)
     VALUES (?, ?, 0, '[]', ?)
     ON CONFLICT(user_id) DO UPDATE SET totp_secret = excluded.totp_secret, totp_enabled = 0, updated_at = excluded.updated_at`,
    [userId, secret, now],
  );
  return secret;
}

export async function confirmTotpSetup(userId: string, code: string) {
  const db = adb();
  const r = (await db.get(SELECT_ROW, [userId])) as SecurityRow | undefined;
  if (!r?.totp_secret) return { error: "Configuration 2FA non démarrée." as const };
  if (!verifyTotp(r.totp_secret, code)) return { error: "Code invalide." as const };
  const backups = generateBackupCodes();
  const hashed = backups.map((c) => bcrypt.hashSync(c, 10));
  await db.run(
    `UPDATE user_security SET totp_enabled = 1, backup_codes_json = ?, updated_at = ? WHERE user_id = ?`,
    [JSON.stringify(hashed), new Date().toISOString(), userId],
  );
  return { backupCodes: backups };
}

export async function disableTotp(userId: string, code: string) {
  if (!(await verifyUserTotp(userId, code))) return { error: "Code invalide." as const };
  const db = adb();
  await db.run(
    `UPDATE user_security SET totp_secret = NULL, totp_enabled = 0, backup_codes_json = '[]', updated_at = ? WHERE user_id = ?`,
    [new Date().toISOString(), userId],
  );
  return { ok: true as const };
}

export async function verifyUserTotp(userId: string, code: string) {
  const db = adb();
  const r = (await db.get(SELECT_ROW, [userId])) as SecurityRow | undefined;
  if (!r || r.totp_enabled !== 1 || !r.totp_secret) return true;
  if (verifyTotp(r.totp_secret, code)) return true;
  try {
    const hashes = JSON.parse(r.backup_codes_json) as string[];
    const idx = hashes.findIndex((h) => bcrypt.compareSync(code.replace(/\s/g, "").toUpperCase(), h));
    if (idx < 0) return false;
    hashes.splice(idx, 1);
    await db.run("UPDATE user_security SET backup_codes_json = ?, updated_at = ? WHERE user_id = ?", [
      JSON.stringify(hashes),
      new Date().toISOString(),
      userId,
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function userRequiresTotp(userId: string) {
  const db = adb();
  const r = (await db.get(SELECT_ROW, [userId])) as SecurityRow | undefined;
  return Boolean(r && r.totp_enabled === 1);
}
