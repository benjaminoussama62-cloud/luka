import crypto from "node:crypto";
import { hashPassword } from "../src/lib/auth-server";
import { getDb } from "../src/lib/storage/database";

async function main() {
  const email = process.argv[2] || process.env.AYEBA_SUPERADMIN_EMAIL;
  if (!email) throw new Error("Provide an email argument or AYEBA_SUPERADMIN_EMAIL.");
  const password = process.env.AYEBA_SUPERADMIN_PASSWORD || crypto.randomBytes(24).toString("base64url");
  if (password.length < 20) throw new Error("AYEBA_SUPERADMIN_PASSWORD must be at least 20 characters.");

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  if (existing) {
    db.prepare("UPDATE users SET role = 'superadmin', password_hash = ?, provider = 'email' WHERE lower(email) = lower(?)").run(await hashPassword(password), email);
  } else {
    db.prepare("INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at) VALUES (?, ?, ?, ?, ?, 'email', 'superadmin', ?)").run(
      id, "Benjamin Oussama", email.trim().toLowerCase(), await hashPassword(password), "#e85d04", now,
    );
  }
  console.log(JSON.stringify({ email: email.trim().toLowerCase(), password, role: "superadmin", resetRequired: true }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
