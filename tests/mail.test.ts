import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/storage/database";
import {
  listContacts,
  listMessages,
  moveToFolder,
  receiveExternalMail,
  sendMail,
  smtpConfigured,
  snoozeMessage,
  unreadCount,
  updateAccountProfile,
  validateAddress,
} from "@/lib/mail/mail";

let seq = 0;
function seedAccount(local = `t${++seq}`) {
  const s = ++seq;
  const db = getDb();
  const uid = `u-${local}`;
  const now = new Date().toISOString();
  // Idempotent : on repart de zéro pour ce compte de test (INSERT franc — les
  // erreurs de schéma remontent au lieu d'être masquées par OR IGNORE).
  db.prepare("DELETE FROM mail_accounts WHERE id = ?").run(`acc-${local}`);
  db.prepare("DELETE FROM users WHERE id = ?").run(uid);
  db.prepare(
    "INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)",
  ).run(uid, local, `${local}@users.test`, now);
  // Téléphone dérivé du nom — déterministe, pas de collision entre runs.
  let h = 0;
  for (const c of `phone-${local}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const phone = `+2438${String(h % 1e8).padStart(8, "0")}`;
  db.prepare("DELETE FROM mail_accounts WHERE phone = ?").run(phone);
  db.prepare(
    `INSERT INTO mail_accounts (id, user_id, address, email, phone, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
  ).run(`acc-${local}`, uid, local, `${local}@ayeba.app`, phone, now);
  return {
    id: `acc-${local}`,
    userId: uid,
    address: local,
    email: `${local}@ayeba.app`,
    phone: "",
    createdAt: now,
    lastLoginAt: null,
    status: "active" as const,
    displayName: "",
    birthdate: "",
    recoveryEmail: "",
    avatar: "",
    signature: "",
  };
}

describe("validateAddress", () => {
  it("rejette les adresses réservées et invalides", async () => {
    expect(validateAddress("admin").ok).toBe(false);
    expect(validateAddress("ab").ok).toBe(false); // < 3 car.
    expect(validateAddress("Ayeba").ok).toBe(false); // majuscules interdites
    expect(validateAddress("-tiret").ok).toBe(false);
    expect(validateAddress("benjamin.oussama").ok).toBe(true);
  });
});

describe("sendMail — livraison interne", () => {
  it("livre une copie inbox au destinataire + copie sent à l'expéditeur", async () => {
    const a = seedAccount("alice");
    const b = seedAccount("bob");
    const res = await sendMail(a as never, [b.email], "Salut Bob", "Contenu réel");
    expect(res.delivered).toContain(b.email);
    expect((await listMessages(b.id, "inbox")).some((m) => m.subject === "Salut Bob")).toBe(true);
    expect((await listMessages(a.id, "sent")).some((m) => m.subject === "Salut Bob")).toBe(true);
    expect(await unreadCount(b.id)).toBeGreaterThan(0);
  });

  it("bounce honnête si le compte @ayeba.app n'existe pas", async () => {
    const a = seedAccount("carol");
    const res = await sendMail(a as never, ["ghost@ayeba.app"], "Test", "x");
    expect(res.bounced[0]?.address).toBe("ghost@ayeba.app");
    expect(res.bounced[0]?.reason).toMatch(/n'existe pas/);
    expect(
      (await listMessages(a.id, "inbox")).some((m) => m.kind === "bounce"),
    ).toBe(true);
  });
});

describe("sendMail — externe", () => {
  it("sans SMTP : bounce honnête, jamais de faux succès", async () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    const a = seedAccount("dave");
    const res = await sendMail(a as never, ["x@gmail.com"], "Test", "x");
    expect(res.externals).toHaveLength(0);
    expect(res.bounced[0]?.address).toBe("x@gmail.com");
    expect(res.bounced[0]?.reason).toMatch(/SMTP/);
    expect(smtpConfigured()).toBe(false);
  });

  it("avec SMTP configuré : externe routé vers le relais", async () => {
    vi.stubEnv("SMTP_HOST", "smtp-relay.brevo.com");
    vi.stubEnv("SMTP_USER", "u");
    vi.stubEnv("SMTP_PASS", "p");
    const a = seedAccount("erin");
    const res = await sendMail(a as never, ["y@gmail.com"], "Test", "x");
    expect(res.externals).toContain("y@gmail.com");
    expect(res.bounced).toHaveLength(0);
    vi.unstubAllEnvs();
  });
});

describe("receiveExternalMail — réception inbound", () => {
  it("livre aux comptes internes, ignore le reste", async () => {
    const a = seedAccount("frank");
    const r = await receiveExternalMail({
      from: "ami@gmail.com",
      fromName: "Ami",
      to: [a.email, "inconnu@ayeba.app", "x@autre.cd"],
      subject: "De l'extérieur",
      body: "Corps externe réel",
      messageId: "msg-1",
    });
    expect(r.delivered).toEqual([a.email]);
    expect(r.dropped).toContain("inconnu@ayeba.app");
    expect(
      (await listMessages(a.id, "inbox")).some((m) => m.from === "ami@gmail.com"),
    ).toBe(true);
  });
});

describe("dossiers Gmail — spam, archive, snooze", () => {
  it("moveToFolder accepte spam et snoozed, refuse l'inconnu", async () => {
    const a = seedAccount("sp1");
    const b = seedAccount("sp2");
    await sendMail(a as never, [b.email], "Spam test", "x");
    const m = (await listMessages(b.id, "inbox"))[0];
    await moveToFolder(b.id, m.id, "spam");
    expect((await listMessages(b.id, "spam")).some((x) => x.id === m.id)).toBe(true);
    expect((await listMessages(b.id, "inbox")).some((x) => x.id === m.id)).toBe(false);
    await moveToFolder(b.id, m.id, "dossier-inexistant");
    expect((await listMessages(b.id, "spam")).some((x) => x.id === m.id)).toBe(true);
  });

  it("snooze : sort de la boîte puis revient non lu à échéance", async () => {
    const a = seedAccount("sn1");
    const b = seedAccount("sn2");
    await sendMail(a as never, [b.email], "À plus tard", "x");
    const m = (await listMessages(b.id, "inbox"))[0];

    const futur = new Date(Date.now() + 3600e3).toISOString();
    await snoozeMessage(b.id, m.id, futur);
    expect((await listMessages(b.id, "inbox")).some((x) => x.id === m.id)).toBe(false);
    expect((await listMessages(b.id, "snoozed"))[0]?.snoozeUntil).toBe(futur);

    // Échéance dépassée → retour en inbox au prochain relevé, non lu.
    await snoozeMessage(b.id, m.id, new Date(Date.now() - 1000).toISOString());
    const inbox = await listMessages(b.id, "inbox");
    const back = inbox.find((x) => x.id === m.id);
    expect(back).toBeTruthy();
    expect(back!.read).toBe(false);
    expect((await listMessages(b.id, "snoozed")).length).toBe(0);
  });

  it("déplacement manuel depuis snoozed efface l'échéance", async () => {
    const a = seedAccount("sn3");
    const b = seedAccount("sn4");
    await sendMail(a as never, [b.email], "Report", "x");
    const m = (await listMessages(b.id, "inbox"))[0];
    await snoozeMessage(b.id, m.id, new Date(Date.now() + 3600e3).toISOString());
    await moveToFolder(b.id, m.id, "archive");
    expect((await listMessages(b.id, "archive"))[0]?.snoozeUntil).toBeNull();
  });
});

describe("listContacts — autocomplete", () => {
  it("agrège expéditeurs et destinataires sans doublon", async () => {
    const a = seedAccount("ct1");
    const b = seedAccount("ct2");
    await sendMail(a as never, [b.email], "Hey", "x");
    await sendMail(b as never, [a.email], "Re", "x");
    const contacts = await listContacts(a.id);
    const emails = contacts.map((c) => c.email);
    expect(emails).toContain(b.email);
    expect(emails.filter((e) => e === b.email)).toHaveLength(1);
  });
});

describe("updateAccountProfile — sécurité", () => {
  it("rejette noms et avatars invalides", async () => {
    const a = seedAccount("gina");
    expect(await updateAccountProfile(a.id, { displayName: "x" })).toHaveProperty("error");
    expect(
      await updateAccountProfile(a.id, { displayName: "a<b" }),
    ).toHaveProperty("error");
    expect(
      await updateAccountProfile(a.id, { avatar: "data:image/svg+xml;base64,AAA" }),
    ).toHaveProperty("error");
    expect(
      await updateAccountProfile(a.id, { displayName: "Gina Test", signature: "— G" }),
    ).toEqual({ ok: true });
  });
});
