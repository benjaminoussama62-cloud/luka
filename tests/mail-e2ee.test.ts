import { describe, expect, it, vi } from "vitest";
import { getDb } from "@/lib/storage/database";
import {
  createContentKey,
  decryptBytes,
  decryptUtf8,
  encryptBytes,
  encryptUtf8,
  generateVault,
  openContentKey,
  unlockVault,
  wrapContentKey,
} from "@/lib/mail/e2ee";
import {
  deliverSealedMail,
  getMessage,
  listMessages,
  receiveExternalMail,
  saveUploadBlob,
  saveVault,
} from "@/lib/mail/mail";

let seq = 0;
function seedAccount(local = `e${++seq}`) {
  const s = ++seq;
  const db = getDb();
  const uid = `u-${local}`;
  const now = new Date().toISOString();
  db.prepare("DELETE FROM mail_accounts WHERE id = ?").run(`acc-${local}`);
  db.prepare("DELETE FROM users WHERE id = ?").run(uid);
  db.prepare("INSERT INTO users (id, name, email, created_at) VALUES (?, ?, ?, ?)").run(
    uid,
    local,
    `${local}@users.test`,
    now,
  );
  db.prepare(
    `INSERT INTO mail_accounts (id, user_id, address, email, phone, created_at, status, display_name)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).run(`acc-${local}`, uid, local, `${local}@ayeba.app`, `+24382${String(s).padStart(7, "0")}`, now, local);
  return {
    id: `acc-${local}`,
    userId: uid,
    address: local,
    email: `${local}@ayeba.app`,
    phone: "",
    displayName: local,
    birthdate: "",
    recoveryEmail: "",
    avatar: "",
    signature: "",
    status: "active",
    createdAt: now,
  };
}

describe("coffre e2e", () => {
  it("ouvre un message que le serveur ne peut pas lire, pièce jointe comprise", async () => {
    const alice = seedAccount("alicee2e");
    const bob = seedAccount("bobe2e");
    const aliceVault = await generateVault("phrase-alice-solide");
    const bobVault = await generateVault("phrase-bob-solide-2");
    expect(saveVault(alice.id, {
      ecdhPublic: aliceVault.session.ecdhPublic,
      ecdsaPublic: aliceVault.session.ecdsaPublic,
      privWrap: aliceVault.privWrap,
      recoveryWrap: aliceVault.recoveryWrap,
      fingerprint: aliceVault.session.fingerprint,
    })).toEqual({ ok: true });
    expect(saveVault(bob.id, {
      ecdhPublic: bobVault.session.ecdhPublic,
      ecdsaPublic: bobVault.session.ecdsaPublic,
      privWrap: bobVault.privWrap,
      recoveryWrap: bobVault.recoveryWrap,
      fingerprint: bobVault.session.fingerprint,
    })).toEqual({ ok: true });

    const unlocked = await unlockVault(
      "phrase-bob-solide-2",
      bobVault.privWrap,
      bobVault.session.ecdhPublic,
      bobVault.session.ecdsaPublic,
      "passphrase",
    );
    const viaRecovery = await unlockVault(
      bobVault.recoveryKey,
      bobVault.recoveryWrap,
      bobVault.session.ecdhPublic,
      bobVault.session.ecdsaPublic,
      "recovery",
    );
    expect(viaRecovery.fingerprint).toBe(bobVault.session.fingerprint);

    const { raw, key } = await createContentKey();
    const subjectCipher = await encryptUtf8(key, "Sujet secret");
    const bodyCipher = await encryptUtf8(key, "Le corps ne doit jamais être en clair.");
    const file = new Uint8Array([1, 2, 3, 4, 9, 8, 7]);
    const name = await encryptUtf8(key, JSON.stringify({ name: "note.txt", mime: "text/plain" }));
    const encFile = await encryptBytes(key, file);
    const saved = saveUploadBlob(alice.id, {
      bytes: Buffer.from(encFile.ct),
      fileIv: encFile.iv,
      nameIv: name.iv,
      nameCt: name.ct,
    });
    expect("id" in saved).toBe(true);
    if (!("id" in saved)) return;

    const wraps = {
      [alice.email]: await wrapContentKey(aliceVault.session.ecdhPublic, raw),
      [bob.email]: await wrapContentKey(bobVault.session.ecdhPublic, raw),
    };
    raw.fill(0);

    const res = await deliverSealedMail(alice as never, {
      to: [bob.email],
      subjectCipher,
      bodyCipher,
      wraps,
      blobIds: [saved.id],
    });
    expect(res.delivered).toContain(bob.email);
    expect(res.bounced).toHaveLength(0);

    const db = getDb();
    const stored = db
      .prepare("SELECT subject_enc, body_enc, enc FROM mail_messages WHERE account_id = ? AND folder = 'inbox'")
      .all(bob.id) as { subject_enc: string; body_enc: string; enc: number }[];
    expect(stored.some((r) => r.enc === 1)).toBe(true);
    const blob = stored.find((r) => r.enc === 1)!;
    expect(blob.subject_enc).not.toContain("Sujet secret");
    expect(blob.body_enc).not.toContain("Le corps");
    expect(blob.body_enc).not.toContain("note.txt");

    const inbox = listMessages(bob.id, "inbox").find((m) => m.enc === 1);
    expect(inbox?.subject).toBe("");
    expect(inbox?.attachmentCount).toBe(1);
    const full = getMessage(bob.id, inbox!.id)!;
    const contentKey = await openContentKey(unlocked, full.wrap!);
    expect(await decryptUtf8(contentKey, full.sealedSubject!)).toBe("Sujet secret");
    expect(await decryptUtf8(contentKey, full.sealedBody!)).toBe("Le corps ne doit jamais être en clair.");
    const att = full.attachments[0];
    const row = db
      .prepare("SELECT data, file_iv FROM mail_attachments WHERE id = ?")
      .get(att.id) as { data: Buffer; file_iv: string };
    const plain = await decryptBytes(contentKey, row.file_iv, new Uint8Array(row.data));
    expect([...plain]).toEqual([...file]);
    const meta = JSON.parse(await decryptUtf8(contentKey, { iv: att.nameIv, ct: att.nameCt })) as { name: string };
    expect(meta.name).toBe("note.txt");
  }, 60_000);

  it("scelle un mail externe entrant et refuse l'envoi hors coffre sans confirmation", async () => {
    const bob = seedAccount("bobe2ein");
    const vault = await generateVault("phrase-inbound-ok");
    saveVault(bob.id, {
      ecdhPublic: vault.session.ecdhPublic,
      ecdsaPublic: vault.session.ecdsaPublic,
      privWrap: vault.privWrap,
      recoveryWrap: vault.recoveryWrap,
      fingerprint: vault.session.fingerprint,
    });
    const received = await receiveExternalMail({
      from: "ami@gmail.com",
      fromName: "Ami",
      to: [bob.email],
      subject: "Depuis Gmail",
      body: "Texte arrivé en clair puis scellé",
    });
    expect(received.delivered).toEqual([bob.email]);
    const msg = listMessages(bob.id, "inbox").find((m) => m.from === "ami@gmail.com");
    expect(msg?.enc).toBe(1);
    expect(msg?.subject).toBe("");
    const raw = getDb()
      .prepare("SELECT subject_enc FROM mail_messages WHERE id = ?")
      .get(msg!.id) as { subject_enc: string };
    expect(raw.subject_enc).not.toContain("Depuis Gmail");

    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "u");
    vi.stubEnv("SMTP_PASS", "p");
    const alice = seedAccount("aliceext");
    const av = await generateVault("phrase-externe-alice");
    saveVault(alice.id, {
      ecdhPublic: av.session.ecdhPublic,
      ecdsaPublic: av.session.ecdsaPublic,
      privWrap: av.privWrap,
      recoveryWrap: av.recoveryWrap,
      fingerprint: av.session.fingerprint,
    });
    const { raw: contentRaw, key } = await createContentKey();
    const denied = await deliverSealedMail(alice as never, {
      to: ["x@gmail.com"],
      subjectCipher: await encryptUtf8(key, "Dehors"),
      bodyCipher: await encryptUtf8(key, "secret"),
      wraps: { [alice.email]: await wrapContentKey(av.session.ecdhPublic, contentRaw) },
      blobIds: [],
      externalAck: false,
    });
    contentRaw.fill(0);
    expect(denied.delivered).not.toContain("x@gmail.com");
    expect(denied.bounced[0]?.reason).toMatch(/coffre/);
    vi.unstubAllEnvs();
  }, 60_000);
});
