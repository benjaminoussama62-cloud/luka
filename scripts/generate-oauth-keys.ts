#!/usr/bin/env npx tsx
/**
 * Génère une paire RSA pour signer les id_token OAuth (RS256).
 * Copiez la sortie dans Vercel : OAUTH_RSA_PRIVATE_KEY, OAUTH_RSA_PUBLIC_KEY, OAUTH_RSA_KID
 */
import { exportPKCS8, exportSPKI, generateKeyPair } from "jose";

async function main() {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  const privatePem = await exportPKCS8(privateKey);
  const publicPem = await exportSPKI(publicKey);
  const kid = `ayeba-oauth-${new Date().getFullYear()}`;

  console.log("=== OAUTH_RSA_KID ===");
  console.log(kid);
  console.log("\n=== OAUTH_RSA_PRIVATE_KEY (une ligne avec \\n) ===");
  console.log(privatePem.replace(/\n/g, "\\n"));
  console.log("\n=== OAUTH_RSA_PUBLIC_KEY (une ligne avec \\n) ===");
  console.log(publicPem.replace(/\n/g, "\\n"));
}

main().catch(console.error);
