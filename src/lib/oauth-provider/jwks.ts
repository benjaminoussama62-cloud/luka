import { exportJWK, generateKeyPair, importPKCS8, importSPKI, type JWK } from "jose";

let cached: {
  privateKey: CryptoKey;
  publicJwk: JWK;
  kid: string;
} | null = null;

function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function normalizePem(raw: string) {
  return raw.replace(/\\n/g, "\n").trim();
}

async function generateDevKeys(kid: string) {
  const { privateKey, publicKey } = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  const publicJwk = await exportJWK(publicKey);
  publicJwk.use = "sig";
  publicJwk.alg = "RS256";
  publicJwk.kid = kid;
  return { privateKey, publicJwk, kid };
}

export async function getOAuthSigningKey() {
  if (cached) return cached;

  const kid = process.env.OAUTH_RSA_KID?.trim() || "ayeba-oauth-1";
  const privatePem = process.env.OAUTH_RSA_PRIVATE_KEY?.trim();
  const publicPem = process.env.OAUTH_RSA_PUBLIC_KEY?.trim();

  if (privatePem && publicPem) {
    const privateKey = await importPKCS8(normalizePem(privatePem), "RS256");
    const publicKey = await importSPKI(normalizePem(publicPem), "RS256");
    const publicJwk = await exportJWK(publicKey);
    publicJwk.use = "sig";
    publicJwk.alg = "RS256";
    publicJwk.kid = kid;
    cached = { privateKey, publicJwk, kid };
    return cached;
  }

  if (isBuildPhase() || process.env.NODE_ENV !== "production") {
    cached = await generateDevKeys(kid);
    return cached;
  }

  throw new Error(
    "OAUTH_RSA_PRIVATE_KEY et OAUTH_RSA_PUBLIC_KEY requis en production. Exécutez: npx tsx scripts/generate-oauth-keys.ts",
  );
}

export async function getJwksDocument() {
  const { publicJwk } = await getOAuthSigningKey();
  return { keys: [publicJwk] };
}
