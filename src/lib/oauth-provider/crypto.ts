import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

export function generateClientId() {
  return `ayeba_${randomBytes(16).toString("hex")}`;
}

export function generateClientSecret() {
  return `ayeba_secret_${randomBytes(32).toString("base64url")}`;
}

export function hashClientSecret(secret: string) {
  return bcrypt.hashSync(secret, 10);
}

export function verifyClientSecret(secret: string, hash: string) {
  return bcrypt.compareSync(secret, hash);
}

export function generateAuthCode() {
  return randomBytes(32).toString("base64url");
}

export function generateOpaqueToken() {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyPkce(codeVerifier: string, challenge: string, method: string) {
  if (method === "plain") return codeVerifier === challenge;
  if (method === "S256") {
    const digest = createHash("sha256").update(codeVerifier).digest("base64url");
    return digest === challenge;
  }
  return false;
}
