import { beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/storage/database";

vi.stubEnv("AYEBA_SIGNING_SECRET", "test-money-secret-0123456789abcdef");

let seq = 0;
const now = () => new Date().toISOString();
// Namespace unique par exécution : la DB de dev persiste entre les runs —
// handles, users et event_id fixes entreraient en collision avec l'état
// laissé par le run précédent.
const RUN = Date.now().toString(36);

function seedUser(tag?: string) {
  const local = tag ?? `m${++seq}`;
  const uid = `mu-${local}-${RUN}`;
  getDb()
    .prepare(
      "INSERT OR REPLACE INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(uid, local, `${local}-${RUN}@users.test`, now());
  return uid;
}

/** Crédite un solde via un vrai couple transaction+entry (scaffolding de test). */
function grant(walletId: string, currency: string, minor: number) {
  const db = getDb();
  const txId = `seed_${crypto.randomUUID().replace(/-/g, "")}`;
  db.prepare(
    `INSERT INTO money_transactions (id, kind, status, currency, amount_minor, to_wallet_id, created_at, completed_at)
     VALUES (?, 'deposit', 'completed', ?, ?, ?, ?, ?)`,
  ).run(txId, currency, minor, walletId, now(), now());
  db.prepare(
    "INSERT INTO money_balances (wallet_id, currency, amount_minor, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(wallet_id, currency) DO UPDATE SET amount_minor = amount_minor + excluded.amount_minor",
  ).run(walletId, currency, minor, now());
  const bal = db
    .prepare("SELECT amount_minor FROM money_balances WHERE wallet_id = ? AND currency = ?")
    .get(walletId, currency) as { amount_minor: number };
  db.prepare(
    "INSERT INTO money_entries (transaction_id, wallet_id, currency, delta_minor, balance_after_minor, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(txId, walletId, currency, minor, bal.amount_minor, now());
}

describe("money core — grand livre (async)", () => {
  beforeAll(async () => {
    const { moneyDb } = await import("@/lib/money/db");
    await moneyDb(); // applique le schéma via la couche Money
  });

  it("crée un wallet idempotemment avec soldes USD/CDF à zéro", async () => {
    const { getBalances, getOrCreateWallet } = await import("@/lib/money/core");
    const uid = seedUser();
    const w1 = await getOrCreateWallet(uid);
    const w2 = await getOrCreateWallet(uid);
    expect(w1.id).toBe(w2.id);
    expect(w1.status).toBe("active");
    expect(await getBalances(w1.id)).toEqual({ USD: 0, CDF: 0 });
  });

  it("revendique une adresse @pseudo unique", async () => {
    const { claimHandle } = await import("@/lib/money/core");
    const uidA = seedUser();
    const uidB = seedUser();
    const h = `j_${RUN}`;
    expect(await claimHandle(uidA, `@J_${RUN}`)).toBe(h);
    await expect(claimHandle(uidB, h)).rejects.toThrowError(/prise|taken/i);
    await expect(claimHandle(uidB, "!!")).rejects.toThrowError(/invalide/i);
    // Le titulaire peut se re-revendiquer sans erreur.
    expect(await claimHandle(uidA, h)).toBe(h);
  });

  it("transfert : débite, crédite, journalise — atomiquement", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const wb = await core.getOrCreateWallet(b);
    await core.claimHandle(b, `dest_${RUN}`);
    grant(wa.id, "USD", 10_000); // 100.00
    await core.setPin(a, "4321");

    const { tx } = await core.executeTransfer({
      userId: a,
      to: `@dest_${RUN}`,
      amountMinor: 2550,
      currency: "USD",
      pin: "4321",
      idemKey: "k-" + crypto.randomUUID(),
    });
    expect(tx.status).toBe("completed");
    expect((await core.getBalances(wa.id)).USD).toBe(7450);
    expect((await core.getBalances(wb.id)).USD).toBe(2550);
    // Journal : 2 écritures qui s'annulent.
    const entries = getDb()
      .prepare("SELECT * FROM money_entries WHERE transaction_id = ? ORDER BY id")
      .all(tx.id) as Array<{ delta_minor: number; balance_after_minor: number }>;
    expect(entries.map((e) => e.delta_minor)).toEqual([-2550, 2550]);
    expect((await core.reconcileBalances(wa.id)).ok).toBe(true);
    expect((await core.reconcileBalances(wb.id)).ok).toBe(true);
  });

  it("solde insuffisant → rien ne bouge (pas de découvert possible)", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const wb = await core.getOrCreateWallet(b);
    await core.claimHandle(b, `pauvre_${RUN}`);
    grant(wa.id, "USD", 1_000);
    await core.setPin(a, "4321");

    await expect(
      core.executeTransfer({
        userId: a,
        to: `@pauvre_${RUN}`,
        amountMinor: 1_001,
        currency: "USD",
        pin: "4321",
        idemKey: "k-" + crypto.randomUUID(),
      }),
    ).rejects.toThrowError(/insuffisant/i);
    expect((await core.getBalances(wa.id)).USD).toBe(1_000);
    expect((await core.getBalances(wb.id)).USD).toBe(0);
    // Tentative de découvert direct : le CHECK >= 0 bloque aussi au niveau SQL.
    expect(() =>
      getDb()
        .prepare(
          "UPDATE money_balances SET amount_minor = -1 WHERE wallet_id = ? AND currency = 'USD'",
        )
        .run(wa.id),
    ).toThrow();
  });

  it("idempotence : rejouer la même clé ne débite pas deux fois", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const wb = await core.getOrCreateWallet(b);
    await core.claimHandle(b, `idem_${RUN}`);
    grant(wa.id, "USD", 5_000);
    await core.setPin(a, "4321");
    const key = "k-" + crypto.randomUUID();
    const to = `@idem_${RUN}`;

    const r1 = await core.executeTransfer({ userId: a, to, amountMinor: 500, currency: "USD", pin: "4321", idemKey: key });
    const r2 = await core.executeTransfer({ userId: a, to, amountMinor: 500, currency: "USD", pin: "4321", idemKey: key });
    expect(r1.tx.id).toBe(r2.tx.id);
    expect(r2.replayed).toBe(true);
    expect((await core.getBalances(wa.id)).USD).toBe(4_500);
    expect((await core.getBalances(wb.id)).USD).toBe(500);

    // Même clé, paramètres différents → conflit.
    await expect(
      core.executeTransfer({ userId: a, to, amountMinor: 999, currency: "USD", pin: "4321", idemKey: key }),
    ).rejects.toThrowError(/[Ii]dempoten|conflit/i);
  });

  it("idempotence concurrente : deux requêtes simultanées, un seul débit", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const wb = await core.getOrCreateWallet(b);
    await core.claimHandle(b, `race_${RUN}`);
    grant(wa.id, "USD", 5_000);
    await core.setPin(a, "4321");
    const key = "k-race-" + crypto.randomUUID();
    const to = `@race_${RUN}`;

    const [r1, r2] = await Promise.all([
      core.executeTransfer({ userId: a, to, amountMinor: 700, currency: "USD", pin: "4321", idemKey: key }),
      core.executeTransfer({ userId: a, to, amountMinor: 700, currency: "USD", pin: "4321", idemKey: key }),
    ]);
    expect(r1.tx.id).toBe(r2.tx.id);
    expect((await core.getBalances(wa.id)).USD).toBe(4_300); // un seul débit
    expect((await core.getBalances(wb.id)).USD).toBe(700);
  });

  it("concurrence : deux transferts simultanés n'entrent jamais en découvert", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const wb = await core.getOrCreateWallet(b);
    await core.claimHandle(b, `dbl_${RUN}`);
    grant(wa.id, "USD", 1_000);
    await core.setPin(a, "4321");

    const settled = await Promise.allSettled([
      core.executeTransfer({ userId: a, to: `@dbl_${RUN}`, amountMinor: 800, currency: "USD", pin: "4321", idemKey: "k1-" + crypto.randomUUID() }),
      core.executeTransfer({ userId: a, to: `@dbl_${RUN}`, amountMinor: 800, currency: "USD", pin: "4321", idemKey: "k2-" + crypto.randomUUID() }),
    ]);
    const succeeded = settled.filter((r) => r.status === "fulfilled").length;
    // Au plus un transfert peut passer (fonds : 1000, besoin : 800 chacun).
    expect(succeeded).toBe(1);
    const bal = (await core.getBalances(wa.id)).USD;
    expect(bal).toBe(200);
    expect(bal).toBeGreaterThanOrEqual(0);
    expect((await core.reconcileBalances(wa.id)).ok).toBe(true);
  });

  it("PIN requis, mauvais PIN refusé, auto-transfert interdit", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    await core.claimHandle(a, `moi_${RUN}`);
    grant(wa.id, "USD", 1_000);
    await core.setPin(a, "4321");

    await expect(
      core.executeTransfer({ userId: a, to: `@moi_${RUN}`, amountMinor: 100, currency: "USD", pin: "4321", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/soi-même|self/i);

    const b = seedUser();
    await core.claimHandle(b, `cible_${RUN}`);
    await expect(
      core.executeTransfer({ userId: a, to: `@cible_${RUN}`, amountMinor: 100, currency: "USD", pin: "9999", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/PIN/i);

    const c = seedUser(); // sans PIN
    const wc = await core.getOrCreateWallet(c);
    grant(wc.id, "USD", 1_000);
    await expect(
      core.executeTransfer({ userId: c, to: `@cible_${RUN}`, amountMinor: 100, currency: "USD", pin: "4321", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/PIN/i);
  });

  it("dépôt : pending → webhook 'paid' crédite une SEULE fois", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const { tx } = await core.createDepositIntent({
      userId: a, amountMinor: 250_000, currency: "CDF", phone: "+243810000001", idemKey: "k-" + crypto.randomUUID(),
    });
    expect(tx.status).toBe("pending");
    expect((await core.getBalances(wa.id)).CDF).toBe(0);

    const applied = await core.reconcileMoneyWebhook({
      provider: "flash", eventId: `evt-${RUN}-1`, transactionId: tx.id, status: "paid", rawPayload: "{}",
    });
    expect(applied).toBe(true);
    expect((await core.getBalances(wa.id)).CDF).toBe(250_000);
    expect((await core.getTransactionOrThrow(tx.id)).status).toBe("completed");

    // Rejeu du même webhook → ignoré, pas de double crédit.
    const again = await core.reconcileMoneyWebhook({
      provider: "flash", eventId: `evt-${RUN}-1`, transactionId: tx.id, status: "paid", rawPayload: "{}",
    });
    expect(again).toBe(false);
    expect((await core.getBalances(wa.id)).CDF).toBe(250_000);

    // Un second event_id différent sur une tx déjà tranchée → refusé aussi.
    expect(
      await core.reconcileMoneyWebhook({ provider: "flash", eventId: `evt-${RUN}-2`, transactionId: tx.id, status: "paid", rawPayload: "{}" }),
    ).toBe(false);
    expect((await core.getBalances(wa.id)).CDF).toBe(250_000);
    expect((await core.reconcileBalances(wa.id)).ok).toBe(true);
  });

  it("webhooks concurrents pour la même tx : un seul crédit", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    const { tx } = await core.createDepositIntent({
      userId: a, amountMinor: 10_000, currency: "USD", phone: "+243810000011", idemKey: "k-" + crypto.randomUUID(),
    });
    // Deux livraisons simultanées, event_ids DIFFÉRENTS (retry provider).
    const [r1, r2] = await Promise.all([
      core.reconcileMoneyWebhook({ provider: "flash", eventId: `evt-${RUN}-c1`, transactionId: tx.id, status: "paid", rawPayload: "{}" }),
      core.reconcileMoneyWebhook({ provider: "flash", eventId: `evt-${RUN}-c2`, transactionId: tx.id, status: "paid", rawPayload: "{}" }),
    ]);
    expect([r1, r2].filter(Boolean).length).toBe(1);
    expect((await core.getBalances(wa.id)).USD).toBe(10_000);
  });

  it("retrait : hold → échec webhook → reversal recrédite tout", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    grant(wa.id, "USD", 20_000);
    await core.setPin(a, "4321");

    const { tx } = await core.createWithdrawal({
      userId: a, amountMinor: 5_000, currency: "USD", phone: "+243810000002", pin: "4321", idemKey: "k-" + crypto.randomUUID(),
    });
    expect((await core.getBalances(wa.id)).USD).toBe(15_000); // bloqué

    await core.reconcileMoneyWebhook({
      provider: "flash", eventId: `evt-${RUN}-w1`, transactionId: tx.id, status: "failed", rawPayload: "{}",
    });
    expect((await core.getBalances(wa.id)).USD).toBe(20_000); // recrédité
    expect((await core.getTransactionOrThrow(tx.id)).status).toBe("reversed");
    expect((await core.reconcileBalances(wa.id)).ok).toBe(true);
  });

  it("retrait : hold → provider refuse au départ → reversal synchrone", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    grant(wa.id, "USD", 3_000);
    await core.setPin(a, "4321");

    const { tx } = await core.createWithdrawal({
      userId: a, amountMinor: 2_000, currency: "USD", phone: "+243810000003", pin: "4321", idemKey: "k-" + crypto.randomUUID(),
    });
    expect(await core.reverseWithdrawal(tx.id, "provider down")).toBe(true);
    expect((await core.getBalances(wa.id)).USD).toBe(3_000);
    // Double reversal impossible.
    expect(await core.reverseWithdrawal(tx.id, "again")).toBe(false);
  });

  it("retrait : webhook 'paid' → completed, pas de recrédit", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    grant(wa.id, "USD", 8_000);
    await core.setPin(a, "4321");

    const { tx } = await core.createWithdrawal({
      userId: a, amountMinor: 3_000, currency: "USD", phone: "+243810000004", pin: "4321", idemKey: "k-" + crypto.randomUUID(),
    });
    await core.reconcileMoneyWebhook({
      provider: "flash", eventId: `evt-${RUN}-w2`, transactionId: tx.id, status: "paid", rawPayload: "{}",
    });
    expect((await core.getBalances(wa.id)).USD).toBe(5_000);
    expect((await core.getTransactionOrThrow(tx.id)).status).toBe("completed");
  });

  it("wallet gelé : aucun mouvement possible", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const b = seedUser();
    const wa = await core.getOrCreateWallet(a);
    await core.claimHandle(b, `gel_${RUN}`);
    grant(wa.id, "USD", 5_000);
    await core.setPin(a, "4321");

    await core.setWalletStatus(wa.id, "frozen", "test");
    await expect(
      core.executeTransfer({ userId: a, to: `@gel_${RUN}`, amountMinor: 100, currency: "USD", pin: "4321", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/gel/i);
    await expect(
      core.createDepositIntent({ userId: a, amountMinor: 100, currency: "USD", phone: "+243810000005", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/gel/i);
    expect((await core.getBalances(wa.id)).USD).toBe(5_000); // intouché
    // Dégel → tout refonctionne.
    await core.setWalletStatus(wa.id, "active");
    const { tx } = await core.executeTransfer({ userId: a, to: `@gel_${RUN}`, amountMinor: 100, currency: "USD", pin: "4321", idemKey: "k-" + crypto.randomUUID() });
    expect(tx.status).toBe("completed");
  });

  it("réconciliation globale : détecte la dérive et les pending stale", async () => {
    const core = await import("@/lib/money/core");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    grant(wa.id, "USD", 9_000);

    // Corruption volontaire du cache solde (simule un bug/manipulation).
    getDb()
      .prepare("UPDATE money_balances SET amount_minor = amount_minor - 1 WHERE wallet_id = ? AND currency = 'USD'")
      .run(wa.id);
    const report = await core.reconcileAll();
    expect(report.drift.some((d) => d.walletId === wa.id)).toBe(true);
    expect((await core.reconcileBalances(wa.id)).ok).toBe(false);
  });

  it("verrouillage PIN après échecs répétés", async () => {
    const core = await import("@/lib/money/core");
    const { PIN_MAX_FREE_ATTEMPTS } = await import("@/lib/money/pin");
    const a = seedUser();
    const wa = await core.getOrCreateWallet(a);
    grant(wa.id, "USD", 1_000);
    await core.setPin(a, "4321");
    const b = seedUser();
    await core.claimHandle(b, `vict_${RUN}`);

    for (let i = 0; i < PIN_MAX_FREE_ATTEMPTS; i++) {
      await expect(
        core.executeTransfer({ userId: a, to: `@vict_${RUN}`, amountMinor: 100, currency: "USD", pin: "0000", idemKey: "k-" + crypto.randomUUID() }),
      ).rejects.toThrow();
    }
    // Verrouillé : même le BON PIN est refusé.
    await expect(
      core.executeTransfer({ userId: a, to: `@vict_${RUN}`, amountMinor: 100, currency: "USD", pin: "4321", idemKey: "k-" + crypto.randomUUID() }),
    ).rejects.toThrowError(/verrouill|essais|429/i);
    expect((await core.getBalances(wa.id)).USD).toBe(1_000);
  });
});
