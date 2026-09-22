/* Test fonctionnel Ayeba Mail — exécute le vrai module contre la vraie DB. */
import { getDb } from "@/lib/storage/database";
import {
  addressAvailable,
  createVerification,
  getAccountByEmail,
  getAccountByUser,
  listMessages,
  normalizePhone,
  sendMail,
  unreadCount,
  validateAddress,
  validateProfile,
  verifyAndCreateAccount,
} from "@/lib/mail/mail";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
}

const db = getDb();
// Nettoie les données de test précédentes (adresses *.test / téléphones test).
db.prepare("DELETE FROM mail_messages").run();
db.prepare("DELETE FROM mail_verifications").run();
db.prepare("DELETE FROM mail_accounts WHERE address LIKE '%.test' OR phone LIKE '+2438%'").run();
db.prepare("DELETE FROM users WHERE id LIKE 'u_%'").run();

const mkUser = (email: string) => {
  const id = `u_${email.split("@")[0]}`;
  db.prepare(
    "INSERT OR REPLACE INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, '', ?)",
  ).run(id, email.split("@")[0], email, new Date().toISOString());
  return id;
};

console.log("\n── Téléphone ──");
check("normalise 0812… → +243…", normalizePhone("0812 345 678") === "+243812345678");
check("normalise +243…", normalizePhone("+243 812 345 678") === "+243812345678");
check("rejette vide", normalizePhone("") === null);
check("rejette lettres", normalizePhone("abc") === null);

console.log("\n── Adresses ──");
check("benjaminoussama ok", validateAddress("benjaminoussama").ok);
check("rejette trop court", !validateAddress("ab").ok);
check("rejette admin (réservé)", !validateAddress("admin").ok);
check("rejette support (réservé)", !validateAddress("support").ok);
check("rejette .. consécutifs", !validateAddress("a..b").ok);

console.log("\n── Profil d'inscription ──");
const okP = validateProfile({ displayName: "Alice Test", birthdate: "1995-06-15", recoveryEmail: "" });
check("profil valide accepté", okP.ok);
check("mineur refusé (<13)", !validateProfile({ displayName: "Kid", birthdate: "2020-01-01" }).ok);
check("nom trop court refusé", !validateProfile({ displayName: "A", birthdate: "1990-01-01" }).ok);
check("récupération invalide refusée", !validateProfile({ displayName: "Alice", birthdate: "1990-01-01", recoveryEmail: "pas-un-mail" }).ok);

console.log("\n── Inscription (code) ──");
const u1 = mkUser("alice@x.cd");
const u2 = mkUser("bob@x.cd");
const PROF1 = { displayName: "Alice Test", birthdate: "1995-06-15", recoveryEmail: "" };
const PROF2 = { displayName: "Bob Deux", birthdate: "1992-03-20", recoveryEmail: "" };
const v1 = createVerification(u1, "+243812345678", "alice.test", PROF1);
check("code généré 6 chiffres", "code" in v1 && /^\d{6}$/.test(v1.code));

const vDup = createVerification(u2, "+243812345679", "alice.test", PROF2);
check("adresse prise bloquée (verif en cours)", "error" in vDup && /prise/.test(vDup.error));

const badCode = verifyAndCreateAccount(u1, "+243812345678", "000000");
check("mauvais code refusé", !badCode.ok && /incorrect/i.test(badCode.error));

if ("code" in v1) {
  const acc = verifyAndCreateAccount(u1, "+243812345678", v1.code);
  check("compte créé avec bon code", acc.ok);
  check("email = alice.test@ayeba.app", acc.ok && acc.account.email === "alice.test@ayeba.app");
}

const vPhone = createVerification(u2, "+243812345678", "bob.test", PROF2);
check("même numéro refusé", "error" in vPhone && /numéro/i.test(vPhone.error));

const acc1 = getAccountByUser(u1)!;
check("bienvenue système en boîte", listMessages(acc1.id, "inbox").some((m) => m.kind === "system"));
check("nom complet enregistré", acc1.displayName === "Alice Test");

console.log("\n── Envoi interne + bounce ──");
const v2 = createVerification(u2, "+243812345679", "bob.test", PROF2);
if ("code" in v2) verifyAndCreateAccount(u2, "+243812345679", v2.code);
const acc2 = getAccountByUser(u2)!;

const r = sendMail(acc1, ["bob.test@ayeba.app", "personne@ayeba.app"], "Test réel", "Corps du message");
check("livré à bob.test", r.delivered.includes("bob.test@ayeba.app"));
check("bounce personne@ayeba.app", r.bounced.some((b) => b.address === "personne@ayeba.app"));

const inbox2 = listMessages(acc2.id, "inbox");
check("bob reçoit le mail en inbox", inbox2.some((m) => m.subject === "Test réel" && m.from === "alice.test@ayeba.app"));
check("nom affiché de l'expéditeur", inbox2.some((m) => m.fromName === "Alice Test"));
check("non lu comptabilisé", unreadCount(acc2.id) >= 1);

const inbox1 = listMessages(acc1.id, "inbox");
check("bounce dans la boîte de alice", inbox1.some((m) => m.kind === "bounce" && /personne@ayeba\.app/.test(m.body)));
check("copie envoyés chez alice", listMessages(acc1.id, "sent").some((m) => m.subject === "Test réel"));

const ext = sendMail(acc1, ["x@gmail.com"], "Ext", "corps");
check("externe refusé honnêtement", ext.bounced.some((b) => /externe/i.test(b.reason)) && !ext.delivered.length);

console.log("\n── Isolation ──");
check("bob ne voit pas les mails d'alice", !listMessages(acc2.id, "sent").length);
check("lookup par email", getAccountByEmail("alice.test@ayeba.app")?.userId === u1);
check("unicité casse", !addressAvailable("ALICE.TEST"));

console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
