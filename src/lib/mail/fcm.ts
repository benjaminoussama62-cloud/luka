import crypto from "crypto";

/**
 * Push FCM HTTP v1 — zéro dépendance (JWT RS256 signé via node:crypto).
 * Requis : FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY (service account).
 * Sans ces variables : no-op silencieux.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export function fcmConfigured(): boolean {
  return Boolean(
    process.env.FCM_PROJECT_ID &&
      process.env.FCM_CLIENT_EMAIL &&
      process.env.FCM_PRIVATE_KEY,
  );
}

const b64u = (buf: Buffer | string) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cachedToken: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64u(
    JSON.stringify({
      iss: process.env.FCM_CLIENT_EMAIL,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const sig = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(process.env.FCM_PRIVATE_KEY!.replace(/\\n/g, "\n"));
  const jwt = `${unsigned}.${b64u(sig)}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!data.access_token) throw new Error(`fcm oauth: ${data.error || res.status}`);
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in || 3500) * 1000 };
  return cachedToken.token;
}

/** Envoie une notification push à un appareil (data-only : l'app compose). */
export async function sendPush(
  token: string,
  data: { title: string; body: string; mailId?: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!fcmConfigured()) return { ok: false, error: "fcm non configuré" };
  try {
    const auth = await accessToken();
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${auth}`, "content-type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: data.title, body: data.body },
            data: { mailId: data.mailId || "" },
            android: { priority: "HIGH" },
          },
        }),
      },
    );
    if (res.ok) return { ok: true };
    const err = await res.text();
    return { ok: false, error: `fcm ${res.status}: ${err.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fcm erreur" };
  }
}
