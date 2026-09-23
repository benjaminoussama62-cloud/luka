import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/storage/database";
import {
  listMessages,
  receiveExternalMail,
  sendMail,
  smtpConfigured,
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
  db.prepare(
    `INSERT INTO mail_accounts (id, user_id, address, email, phone, created_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
  ).run(`acc-${local}`, uid, local, `${local}@ayeba.app`, `+24381${String(s).padStart(7, "0")}`, now);
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
  it("rejette les adresses réservées et invalides", () => {
    expect(validateAddress("admin").ok).toBe(false);
    expect(validateAddress("ab").ok).toBe(false); // < 3 car.
    expect(validateAddress("Ayeba").ok).toBe(false); // majuscules interdites
    expect(validateAddress("-tiret").ok).toBe(false);
    expect(validateAddress("benjamin.oussama").ok).toBe(true);
  });
});

describe("sendMail — livraison interne", () => {
  it("livre une copie inbox au destinataire + copie sent à l'expéditeur", () => {
    const a = seedAccount("alice");
    const b = seedAccount("bob");
    const res = sendMail(a as never, [b.email], "Salut Bob", "Contenu réel");
    expect(res.delivered).toContain(b.email);
    expect(listMessages(b.id, "inbox").some((m) => m.subject === "Salut Bob")).toBe(true);
    expect(listMessages(a.id, "sent").some((m) => m.subject === "Salut Bob")).toBe(true);
    expect(unreadCount(b.id)).toBeGreaterThan(0);
  });

  it("bounce honnête si le compte @ayeba.app n'existe pas", () => {
    const a = seedAccount("carol");
    const res = sendMail(a as never, ["ghost@ayeba.app"], "Test", "x");
    expect(res.bounced[0]?.address).toBe("ghost@ayeba.app");
    expect(res.bounced[0]?.reason).toMatch(/n'existe pas/);
    expect(
      listMessages(a.id, "inbox").some((m) => m.kind === "bounce"),
    ).toBe(true);
  });
});

describe("sendMail — externe", () => {
  it("sans SMTP : bounce honnête, jamais de faux succès", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    const a = seedAccount("dave");
    const res = sendMail(a as never, ["x@gmail.com"], "Test", "x");
    expect(res.externals).toHaveLength(0);
    expect(res.bounced[0]?.address).toBe("x@gmail.com");
    expect(res.bounced[0]?.reason).toMatch(/SMTP/);
    expect(smtpConfigured()).toBe(false);
  });

  it("avec SMTP configuré : externe routé vers le relais", () => {
    vi.stubEnv("SMTP_HOST", "smtp-relay.brevo.com");
    vi.stubEnv("SMTP_USER", "u");
    vi.stubEnv("SMTP_PASS", "p");
    const a = seedAccount("erin");
    const res = sendMail(a as never, ["y@gmail.com"], "Test", "x");
    expect(res.externals).toContain("y@gmail.com");
    expect(res.bounced).toHaveLength(0);
    vi.unstubAllEnvs();
  });
});

describe("receiveExternalMail — réception inbound", () => {
  it("livre aux comptes internes, ignore le reste", () => {
    const a = seedAccount("frank");
    const r = receiveExternalMail({
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
      listMessages(a.id, "inbox").some((m) => m.from === "ami@gmail.com"),
    ).toBe(true);
  });
});

describe("updateAccountProfile — sécurité", () => {
  it("rejette noms et avatars invalides", () => {
    const a = seedAccount("gina");
    expect(updateAccountProfile(a.id, { displayName: "x" })).toHaveProperty("error");
    expect(
      updateAccountProfile(a.id, { displayName: "a<b" }),
    ).toHaveProperty("error");
    expect(
      updateAccountProfile(a.id, { avatar: "data:image/svg+xml;base64,AAA" }),
    ).toHaveProperty("error");
    expect(
      updateAccountProfile(a.id, { displayName: "Gina Test", signature: "— G" }),
    ).toEqual({ ok: true });
  });
});
