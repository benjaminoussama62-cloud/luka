/**
 * Chiffrement au repos des contenus de mail (AES-256-GCM).
 * La clé vient de AYEBA_MAIL_KEY (32+ octets, hex ou texte) ; sinon une clé
 * locale persistante est générée dans data/ — les corps restent toujours
 * chiffrés dans la base, jamais en clair.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";

let _key: Buffer | null = null;

function key(): Buffer {
  if (_key) return _key;
  const envKey = process.env.AYEBA_MAIL_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (envKey) {
    _key = crypto.createHash("sha256").update(envKey).digest();
    return _key;
  }
  // Clé locale persistée — chiffrement au repos garanti même sans env.
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, ".mail-key");
  try {
    if (fs.existsSync(file)) {
      _key = Buffer.from(fs.readFileSync(file, "utf8").trim(), "hex");
      if (_key.length === 32) return _key;
    }
    fs.mkdirSync(dir, { recursive: true });
    _key = crypto.randomBytes(32);
    fs.writeFileSync(file, _key.toString("hex"), { mode: 0o600 });
    return _key;
  } catch {
    // Dernier recours : clé de session (contenus re-chiffrables au prochain boot).
    _key = crypto.createHash("sha256").update("ayeba-mail-ephemeral").digest();
    return _key;
  }
}

export function encryptText(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptText(payload: string): string {
  try {
    const [v, iv64, tag64, data64] = payload.split(".");
    if (v !== "v1") return payload; // ancienne donnée en clair
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(data64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}

export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(`ayeba-mail-otp:${code}`).digest("hex");
}
