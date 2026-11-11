/**
 * Ayeba Mbongo — notifications push FCM v1.
 * Le compte de service est lu depuis l'env FCM_SERVICE_ACCOUNT (JSON).
 * Sans la clé, le push est sauté silencieusement (le mail reste la garantie).
 */
import crypto from "crypto";
import { moneyDb } from "./db";

const PROJECT_ID = process.env.FCM_PROJECT_ID || "ayeba-mbongo";

let cachedToken: { token: string; exp: number } | null = null;

function serviceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j.client_email && j.private_key) return j;
    } catch { /* pas du JSON — on tente les champs séparés */ }
  }
  const client_email = process.env.FCM_CLIENT_EMAIL;
  const private_key = process.env.FCM_PRIVATE_KEY;
  if (client_email && private_key) {
    return { client_email, private_key: private_key.replace(/\\n/g, "\n") };
  }
  return null;
}

function base64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

async function accessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${header}.${claim}`), sa.private_key).toString("base64url");
  const jwt = `${header}.${claim}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("FCM oauth failed");
  cachedToken = { token: data.access_token, exp: Date.now() + (data.expires_in || 3500) * 1000 };
  return data.access_token;
}

export async function registerPushToken(userId: string, token: string): Promise<void> {
  if (!token || token.length > 512) return;
  const d = await moneyDb();
  await d.run(
    `INSERT INTO money_push_tokens (user_id, token, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id, token) DO UPDATE SET updated_at = excluded.updated_at`,
    [userId, token, new Date().toISOString()],
  );
}

/** Push vers tous les appareils enregistrés de l'utilisateur. */
export async function pushUser(userId: string, title: string, body: string): Promise<void> {
  const sa = serviceAccount();
  if (!sa) return;
  const d = await moneyDb();
  const rows = (await d.all("SELECT token FROM money_push_tokens WHERE user_id = ?", [userId])) as { token: string }[];
  if (!rows.length) return;
  try {
    const tok = await accessToken(sa);
    await Promise.all(rows.map((r) =>
      fetch(`https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token: r.token,
            notification: { title, body: body.slice(0, 220) },
            data: { title, body: body.slice(0, 400) },
          },
        }),
      }).then(async (res) => {
        if (res.status === 404) {
          // Token mort — nettoyage.
          await d.run("DELETE FROM money_push_tokens WHERE token = ?", [r.token]);
        }
      }).catch(() => {}),
    ));
  } catch { /* push best-effort */ }
}
