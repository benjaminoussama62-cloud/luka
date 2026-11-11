import { describe, expect, it, vi, beforeEach } from "vitest";

// sendExternalMail est simulé — on contrôle succès/échec par test.
const sendMock = vi.fn<() => Promise<{ ok: boolean; error?: string }>>(async () => ({ ok: true }));
vi.mock("@/lib/mail/smtp", () => ({
  sendExternalMail: (...args: unknown[]) => sendMock(...(args as [])),
}));

import { getDb } from "@/lib/storage/database";
import {
  appFromKey,
  createApiKey,
  drainTxQueue,
  isSuppressed,
  queueTx,
  revokeApiKey,
  suppressAddress,
} from "@/lib/mail/transactional";
import { renderTx } from "@/lib/mail/tx-templates";

let seq = 0;
// Sel par run : la file persiste en SQLite entre exécutions — l'idempotence
// détecterait sinon les clés du run précédent comme des doublons.
const RUN = `r${Date.now().toString(36)}`;
const nextTo = () => `dest-${++seq}-${Date.now()}@gmail.com`;
const idem = (tag: string) => `${RUN}-${tag}-${++seq}`;
const q = (id: string) =>
  getDb().prepare("SELECT * FROM mail_outbound_queue WHERE id = ?").get(id) as
    | { status: string; attempts: number; next_retry: string; last_error: string; sent_at: string | null }
    | undefined;

beforeEach(() => {
  sendMock.mockReset().mockResolvedValue({ ok: true });
});

describe("clés API", () => {
  it("crée une clé qui authentifie son app, puis la révoque", async () => {
    const created = await createApiKey("tala", "prod");
    expect("key" in created && created.key.startsWith("txk_")).toBe(true);
    if (!("key" in created)) return;

    const key = await appFromKey(`Bearer ${created.key}`);
    expect(key?.app).toBe("tala");

    await revokeApiKey(created.id);
    expect(await appFromKey(`Bearer ${created.key}`)).toBeNull();
  });

  it("rejette les clés inconnues et les formats invalides", async () => {
    expect(await appFromKey("Bearer txk_mauvaise")).toBeNull();
    expect(await appFromKey(null)).toBeNull();
    expect(await appFromKey("Basic abc")).toBeNull();
  });
});

describe("queueTx — validation", () => {
  it("rejette type inconnu, adresse invalide, clé d'idempotence absente", async () => {
    expect((await queueTx("tala", { type: "pub", to: nextTo(), idempotencyKey: idem("k") })) as { status: number }).toMatchObject({ status: 400 });
    expect((await queueTx("tala", { type: "otp", to: "pas-un-email", idempotencyKey: idem("k") })) as { status: number }).toMatchObject({ status: 400 });
    expect((await queueTx("tala", { type: "otp", to: nextTo(), idempotencyKey: "" })) as { status: number }).toMatchObject({ status: 400 });
  });

  it("enfile et envoie immédiatement — statut sent", async () => {
    const res = await queueTx("tala", {
      type: "otp",
      to: nextTo(),
      data: { code: "847291", name: "Ben" },
      idempotencyKey: idem("otp"),
    });
    expect(res).toMatchObject({ queued: true });
    if (!("id" in res)) return;
    expect(sendMock).toHaveBeenCalledTimes(1);
    const row = q(res.id);
    expect(row?.status).toBe("sent");
    expect(row?.attempts).toBe(1);
    expect(row?.sent_at).toBeTruthy();
    // Le code n'apparaît JAMAIS dans les erreurs/logs persistés.
    expect(row?.last_error || "").not.toContain("847291");
  });

  it("idempotence : même clé métier → même envoi, pas de doublon", async () => {
    const to = nextTo();
    const key = idem("biz");
    const a = await queueTx("mbongo", { type: "receipt", to, idempotencyKey: key, data: { amount: "25 USD" } });
    const b = await queueTx("mbongo", { type: "receipt", to, idempotencyKey: key, data: { amount: "25 USD" } });
    expect("id" in a && "id" in b && a.id === b.id).toBe(true);
    expect(b).toMatchObject({ duplicate: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});

describe("queueTx — suppression & quotas", () => {
  it("n'écrit jamais à une adresse supprimée", async () => {
    const to = nextTo();
    await suppressAddress(to, "hard_bounce", "test");
    expect(await isSuppressed(to)).toBe(true);
    const res = await queueTx("tala", { type: "otp", to, idempotencyKey: idem("s") });
    expect(res).toMatchObject({ status: 422 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("limite à 3 envois / 10 min par destinataire", async () => {
    const to = nextTo();
    for (let i = 0; i < 3; i++) {
      const res = await queueTx("tala", { type: "otp", to, idempotencyKey: idem(`rl-${i}`) });
      expect("id" in res).toBe(true);
    }
    const blocked = await queueTx("tala", { type: "otp", to, idempotencyKey: idem("rl-x") });
    expect(blocked).toMatchObject({ status: 429 });
  });
});

describe("retry & dead-letter", () => {
  it("échec transitoire → pending + backoff ; drain reprend ; succès", async () => {
    sendMock.mockResolvedValueOnce({ ok: false, error: "connection timeout" });
    const res = await queueTx("tala", { type: "alert", to: nextTo(), idempotencyKey: idem("r1"), data: { title: "Alerte" } });
    if (!("id" in res)) throw new Error("non enfilé");
    let row = q(res.id);
    expect(row?.status).toBe("pending");
    expect(row?.attempts).toBe(1);
    expect(new Date(row!.next_retry).getTime()).toBeGreaterThan(Date.now());

    // Écheance passée → le drain reprend le job.
    getDb().prepare("UPDATE mail_outbound_queue SET next_retry = ? WHERE id = ?")
      .run(new Date(Date.now() - 1000).toISOString(), res.id);
    expect(await drainTxQueue(10)).toBe(1);
    row = q(res.id);
    expect(row?.status).toBe("sent");
    expect(row?.attempts).toBe(2);
  });

  it("erreur permanente (5xx) → dead + adresse supprimée", async () => {
    const to = nextTo();
    sendMock.mockResolvedValueOnce({ ok: false, error: "550 rejected: mailbox does not exist" });
    const res = await queueTx("tala", { type: "welcome", to, idempotencyKey: idem("r2") });
    if (!("id" in res)) throw new Error("non enfilé");
    expect(q(res.id)?.status).toBe("dead");
    expect(await isSuppressed(to)).toBe(true);
  });
});

describe("renderTx — templates", () => {
  it("produit HTML + texte + sujet dans les 4 langues", () => {
    for (const locale of ["fr", "en", "ln", "sw"] as const) {
      const m = renderTx("tala", "otp", locale, { code: "847291", name: "Ben", ttl: "10 min" });
      expect(m.subject.length).toBeGreaterThan(5);
      expect(m.html).toContain("<!DOCTYPE html>");
      expect(m.html).toContain("847291");
      expect(m.text).toContain("847291");
      expect(m.html).not.toContain("undefined");
    }
  });

  it("échappe les données utilisateur (XSS) et les URL dangereuses", () => {
    const m = renderTx("omega", "notification", "fr", {
      subject: "Note",
      detail: '<img src=x onerror="alert(1)">',
      url: 'javascript:alert(1)" onmouseover="x',
      cta: '<b>clic</b>',
    });
    expect(m.html).not.toContain('onerror="alert');
    expect(m.html).not.toContain("javascript:");
    expect(m.html).toContain("&lt;img");
    expect(m.html).toContain("&lt;b&gt;clic");
  });

  it("branding par app : couleurs et noms distincts", () => {
    const tala = renderTx("tala", "welcome", "fr", { name: "Ben" });
    const mbongo = renderTx("mbongo", "welcome", "fr", { name: "Ben" });
    expect(tala.html).toContain("TALA");
    expect(mbongo.html).toContain("MBONGO");
    expect(tala.html).not.toBe(mbongo.html);
  });

  it("reçu : montant + référence en ligne de tableau", () => {
    const m = renderTx("mbongo", "receipt", "fr", { amount: "150 USD", ref: "MB-2026-001", counterparty: "marchand@x.cd", name: "Ben" });
    expect(m.html).toContain("150 USD");
    expect(m.html).toContain("MB-2026-001");
    expect(m.text).toContain("150 USD");
  });
});
