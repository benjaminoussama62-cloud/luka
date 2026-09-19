/**
 * Bootstrap the Ayeba super-admin account.
 *
 *   npm run admin:create -- <email> [name]
 *
 * Creates (or repairs) a login user plus an active super_admin row in
 * admin_users, then prints the generated password ONCE to stdout.
 * The password is never stored in plaintext — only its bcrypt hash.
 */
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { getDb } from "../src/lib/storage/database";
import { applyAdminSchema } from "../src/lib/admin/admin-schema";

function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const name = process.argv[3]?.trim() || "Administrateur";
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:create -- <email> [name]");
    process.exit(1);
  }

  const db = getDb();
  applyAdminSchema(db);

  const now = new Date().toISOString();
  const password = `Ayeba-${randomBytes(9).toString("base64url")}!${randomBytes(2).toString("hex")}`;
  const hash = bcrypt.hashSync(password, 12);

  let user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: string }
    | undefined;

  if (!user) {
    const id = randomUUID();
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
       VALUES (?, ?, ?, ?, '#e85d04', 'email', 'admin', ?)`,
    ).run(id, name, email, hash, now);
    user = { id };
    console.log(`Compte utilisateur créé : ${email}`);
  } else {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?").run(hash, user.id);
    console.log(`Compte existant mis à jour : ${email} (nouveau mot de passe, rôle admin)`);
  }

  const existing = db
    .prepare("SELECT id FROM admin_users WHERE user_id = ?")
    .get(user.id) as { id: string } | undefined;

  if (existing) {
    db.prepare("UPDATE admin_users SET role = 'super_admin', status = 'active', last_login_at = ? WHERE id = ?")
      .run(now, existing.id);
  } else {
    db.prepare(
      `INSERT INTO admin_users (id, user_id, name, email, role, permissions, departments, created_at, last_login_at, status)
       VALUES (?, ?, ?, ?, 'super_admin', '["all"]', '["*"]', ?, ?, 'active')`,
    ).run(randomUUID(), user.id, name, email, now, now);
  }

  db.prepare(
    `INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
     VALUES (?, (SELECT id FROM admin_users WHERE user_id = ?), ?, 'bootstrap_admin', 'user', ?, '{}', ?)`,
  ).run(randomUUID(), user.id, name, user.id, now);

  console.log(`Rôle : super_admin (toutes permissions)`);
  console.log(`\nMot de passe (affiché une seule fois) : ${password}\n`);
  console.log(`Connecte-toi sur /ayebi/connexion puis ouvre /admin.`);
}

main();
