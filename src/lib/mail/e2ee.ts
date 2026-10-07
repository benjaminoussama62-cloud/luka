/**
 * Coffre Ayeba Mail — chiffrement de bout en bout (Web Crypto).
 * Même module côté navigateur et côté serveur (crypto.subtle de Node).
 *
 * La phrase secrète et la clé de récupération ne quittent pas l'appareil.
 * Le serveur ne reçoit que les clés publiques et les clés privées déjà enveloppées.
 *
 * Schéma :
 * - ECDH P-256 pour envelopper une clé de message AES-256-GCM (ECIES + HKDF)
 * - ECDSA P-256 pour prouver la possession du coffre (changement de phrase / récupération)
 * - PBKDF2-SHA-256 pour envelopper le trousseau privé
 */
export const PASSPHRASE_ITERATIONS = 600_000;
export const RECOVERY_ITERATIONS = 120_000;
export const MAX_PLAIN_BYTES = 3 * 1024 * 1024;
export const MAX_CIPHER_BYTES = MAX_PLAIN_BYTES + 64 * 1024;
export const MAX_ATTACHMENTS = 3;

const subtle = () => globalThis.crypto.subtle;
const ECIES_INFO = new TextEncoder().encode("ayeba-mail-ecies-v1");

export type CipherPack = { iv: string; ct: string };
export type KeyWrap = { ek: string; iv: string; ct: string };
export type PassWrap = { salt: string; iv: string; ct: string; iterations: number };

export type VaultBundle = { ecdh: JsonWebKey; ecdsa: JsonWebKey };

export type VaultSession = {
  ecdhPrivate: CryptoKey;
  ecdsaPrivate: CryptoKey;
  ecdhPublic: string;
  ecdsaPublic: string;
  fingerprint: string;
  /** Trousseau privé JSON — uniquement en mémoire, pour ré-envelopper. */
  bundle: string;
};

export function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function passphraseError(pw: string): string | null {
  const p = pw.normalize("NFKC");
  if (p.length < 12) return "12 caractères minimum — une phrase, pas un code court.";
  if (p.length > 200) return "200 caractères maximum.";
  if (/^\d+$/.test(p)) return "Ajoutez des lettres : un code uniquement numérique est trop faible.";
  return null;
}

export function normalizeRecoveryKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, "");
}

export function generateRecoveryKey(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const chars = [...buf].map((b) => alphabet[b % 32]);
  return chars.join("").replace(/(.{4})(?=.)/g, "$1-");
}

export async function fingerprintSpki(spkiB64: string): Promise<string> {
  const digest = await subtle().digest("SHA-256", b64ToBytes(spkiB64) as BufferSource);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex
    .slice(0, 32)
    .toUpperCase()
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export async function importPublic(spkiB64: string, alg: "ECDH" | "ECDSA"): Promise<CryptoKey> {
  return subtle().importKey(
    "spki",
    b64ToBytes(spkiB64) as BufferSource,
    { name: alg, namedCurve: "P-256" },
    true,
    alg === "ECDSA" ? ["verify"] : [],
  );
}

async function pbkdf2Key(secret: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await subtle().importKey(
    "raw",
    new TextEncoder().encode(secret.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle().deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapSecret(secret: string, plaintext: string, iterations: number): Promise<PassWrap> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2Key(secret, salt, iterations);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ct: bytesToB64(new Uint8Array(ct)),
    iterations,
  };
}

export async function unwrapSecret(secret: string, wrap: PassWrap): Promise<string> {
  if (wrap.iterations < 100_000 || wrap.iterations > 800_000) {
    throw new Error("Paramètres de dérivation refusés.");
  }
  const key = await pbkdf2Key(secret, b64ToBytes(wrap.salt), wrap.iterations);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(wrap.iv) as BufferSource },
    key,
    b64ToBytes(wrap.ct) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

async function hkdfAes(shared: ArrayBuffer): Promise<CryptoKey> {
  const base = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"]);
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(32), info: ECIES_INFO },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapContentKey(recipientSpkiB64: string, contentKeyRaw: Uint8Array): Promise<KeyWrap> {
  const recipientPub = await importPublic(recipientSpkiB64, "ECDH");
  const eph = await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const shared = await subtle().deriveBits(
    { name: "ECDH", public: recipientPub },
    eph.privateKey,
    256,
  );
  const aes = await hkdfAes(shared);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    aes,
    contentKeyRaw as BufferSource,
  );
  const ek = await subtle().exportKey("spki", eph.publicKey);
  return { ek: bytesToB64(new Uint8Array(ek)), iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
}

export async function unwrapContentKey(privateKey: CryptoKey, wrap: KeyWrap): Promise<Uint8Array> {
  const ephPub = await importPublic(wrap.ek, "ECDH");
  const shared = await subtle().deriveBits({ name: "ECDH", public: ephPub }, privateKey, 256);
  const aes = await hkdfAes(shared);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(wrap.iv) as BufferSource },
    aes,
    b64ToBytes(wrap.ct) as BufferSource,
  );
  return new Uint8Array(plain);
}

export async function createContentKey(): Promise<{ raw: Uint8Array; key: CryptoKey }> {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const key = await importContentKey(raw);
  return { raw, key };
}

async function importContentKey(raw: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey("raw", raw as BufferSource, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptUtf8(key: CryptoKey, text: string): Promise<CipherPack> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(text),
  );
  return { iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
}

export async function decryptUtf8(key: CryptoKey, pack: CipherPack): Promise<string> {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(pack.iv) as BufferSource },
    key,
    b64ToBytes(pack.ct) as BufferSource,
  );
  return new TextDecoder().decode(plain);
}

export async function encryptBytes(key: CryptoKey, data: Uint8Array): Promise<{ iv: string; ct: Uint8Array }> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );
  return { iv: bytesToB64(iv), ct: new Uint8Array(ct) };
}

export async function decryptBytes(key: CryptoKey, ivB64: string, ct: Uint8Array): Promise<Uint8Array> {
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: b64ToBytes(ivB64) as BufferSource },
    key,
    ct as BufferSource,
  );
  return new Uint8Array(plain);
}

export async function sealText(
  recipientSpkiB64: string,
  subject: string,
  body: string,
): Promise<{ subjectCipher: CipherPack; bodyCipher: CipherPack; wrap: KeyWrap }> {
  const raw = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const key = await importContentKey(raw);
  const subjectCipher = await encryptUtf8(key, subject);
  const bodyCipher = await encryptUtf8(key, body);
  const wrap = await wrapContentKey(recipientSpkiB64, raw);
  raw.fill(0);
  return { subjectCipher, bodyCipher, wrap };
}

async function publicFromPrivateJwk(jwk: JsonWebKey, alg: "ECDH" | "ECDSA"): Promise<string> {
  const pub: JsonWebKey = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
  const key = await subtle().importKey(
    "jwk",
    pub,
    { name: alg, namedCurve: "P-256" },
    true,
    alg === "ECDSA" ? ["verify"] : [],
  );
  const spki = await subtle().exportKey("spki", key);
  return bytesToB64(new Uint8Array(spki));
}

async function sessionFromBundle(bundleJson: string, ecdhPublic: string, ecdsaPublic: string): Promise<VaultSession> {
  const bundle = JSON.parse(bundleJson) as VaultBundle;
  if (!bundle?.ecdh || !bundle?.ecdsa) throw new Error("Trousseau illisible.");
  const derivedEcdh = await publicFromPrivateJwk(bundle.ecdh, "ECDH");
  const derivedEcdsa = await publicFromPrivateJwk(bundle.ecdsa, "ECDSA");
  if (derivedEcdh !== ecdhPublic || derivedEcdsa !== ecdsaPublic) {
    throw new Error("Le coffre stocké ne correspond pas à ce trousseau.");
  }
  const ecdhPrivate = await subtle().importKey(
    "jwk",
    bundle.ecdh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  );
  const ecdsaPrivate = await subtle().importKey(
    "jwk",
    bundle.ecdsa,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  return {
    ecdhPrivate,
    ecdsaPrivate,
    ecdhPublic,
    ecdsaPublic,
    fingerprint: await fingerprintSpki(ecdhPublic),
    bundle: bundleJson,
  };
}

export async function generateVault(passphrase: string): Promise<{
  recoveryKey: string;
  session: VaultSession;
  privWrap: PassWrap;
  recoveryWrap: PassWrap;
}> {
  const err = passphraseError(passphrase);
  if (err) throw new Error(err);
  const ecdh = await subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ecdsa = await subtle().generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const bundle: VaultBundle = {
    ecdh: await subtle().exportKey("jwk", ecdh.privateKey),
    ecdsa: await subtle().exportKey("jwk", ecdsa.privateKey),
  };
  const bundleJson = JSON.stringify(bundle);
  const ecdhPublic = bytesToB64(new Uint8Array(await subtle().exportKey("spki", ecdh.publicKey)));
  const ecdsaPublic = bytesToB64(new Uint8Array(await subtle().exportKey("spki", ecdsa.publicKey)));
  const recoveryKey = generateRecoveryKey();
  const [privWrap, recoveryWrap] = await Promise.all([
    wrapSecret(passphrase, bundleJson, PASSPHRASE_ITERATIONS),
    wrapSecret(normalizeRecoveryKey(recoveryKey), bundleJson, RECOVERY_ITERATIONS),
  ]);
  const session = await sessionFromBundle(bundleJson, ecdhPublic, ecdsaPublic);
  return { recoveryKey, session, privWrap, recoveryWrap };
}

export async function unlockVault(
  secret: string,
  wrap: PassWrap,
  ecdhPublic: string,
  ecdsaPublic: string,
  mode: "passphrase" | "recovery",
): Promise<VaultSession> {
  const material = mode === "recovery" ? normalizeRecoveryKey(secret) : secret.normalize("NFKC");
  if (mode === "recovery" && material.length < 20) throw new Error("Clé de récupération incomplète.");
  const bundleJson = await unwrapSecret(material, wrap);
  return sessionFromBundle(bundleJson, ecdhPublic, ecdsaPublic);
}

export async function rewrapPassphrase(session: VaultSession, passphrase: string): Promise<PassWrap> {
  const err = passphraseError(passphrase);
  if (err) throw new Error(err);
  return wrapSecret(passphrase, session.bundle, PASSPHRASE_ITERATIONS);
}

export async function rewrapRecovery(session: VaultSession): Promise<{ recoveryKey: string; recoveryWrap: PassWrap }> {
  const recoveryKey = generateRecoveryKey();
  const recoveryWrap = await wrapSecret(normalizeRecoveryKey(recoveryKey), session.bundle, RECOVERY_ITERATIONS);
  return { recoveryKey, recoveryWrap };
}

export async function signNonce(session: VaultSession, nonce: string): Promise<string> {
  const sig = await subtle().sign(
    { name: "ECDSA", hash: "SHA-256" },
    session.ecdsaPrivate,
    new TextEncoder().encode(nonce),
  );
  return bytesToB64(new Uint8Array(sig));
}

export async function verifyNonce(ecdsaPublicB64: string, nonce: string, sigB64: string): Promise<boolean> {
  try {
    const key = await importPublic(ecdsaPublicB64, "ECDSA");
    return await subtle().verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      b64ToBytes(sigB64) as BufferSource,
      new TextEncoder().encode(nonce),
    );
  } catch {
    return false;
  }
}

export async function openContentKey(session: VaultSession, wrap: KeyWrap): Promise<CryptoKey> {
  const raw = await unwrapContentKey(session.ecdhPrivate, wrap);
  try {
    return await importContentKey(raw);
  } finally {
    raw.fill(0);
  }
}
