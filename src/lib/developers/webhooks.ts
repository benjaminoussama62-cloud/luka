import { createHmac, randomBytes } from "crypto";
import { getDb } from "@/lib/storage/database";

function signature(secret: string, body: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

function owns(clientId: string, userId: string) {
  const row = getDb().prepare("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?").get(clientId) as { owner_user_id: string } | undefined;
  return row?.owner_user_id === userId;
}

export function listWebhooks(clientId: string, userId: string) {
  if (!owns(clientId, userId)) return null;
  return getDb().prepare("SELECT id, url, events, active, failure_count, last_delivery_at, created_at FROM developer_webhooks WHERE client_id = ? ORDER BY created_at DESC").all(clientId);
}

export function createWebhook(input: { clientId: string; userId: string; url: string; events: string[] }) {
  if (!owns(input.clientId, input.userId)) return null;
  const parsed = new URL(input.url);
  if (parsed.protocol !== "https:") throw new Error("Un webhook doit utiliser HTTPS.");
  const id = crypto.randomUUID();
  const secret = `whsec_${randomBytes(32).toString("base64url")}`;
  const now = new Date().toISOString();
  getDb().prepare("INSERT INTO developer_webhooks (id, client_id, url, secret_hash, events, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, input.clientId, input.url, secret, JSON.stringify([...new Set(input.events)]), now);
  return { id, url: input.url, secret, createdAt: now };
}

export function deleteWebhook(id: string, clientId: string, userId: string) {
  if (!owns(clientId, userId)) return false;
  const result = getDb().prepare("DELETE FROM developer_webhooks WHERE id = ? AND client_id = ?").run(id, clientId) as { changes?: number };
  return (result.changes ?? 0) > 0;
}

export async function dispatchDeveloperWebhook(clientId: string, event: string, data: unknown) {
  const db = getDb();
  const hooks = db.prepare("SELECT id, url, secret_hash, events FROM developer_webhooks WHERE client_id = ? AND active = 1").all(clientId) as { id: string; url: string; secret_hash: string; events: string }[];
  const body = JSON.stringify({ id: crypto.randomUUID(), event, created_at: new Date().toISOString(), data });
  await Promise.allSettled(hooks.filter((hook) => {
    const events = JSON.parse(hook.events) as string[];
    return events.includes("*") || events.includes(event);
  }).map(async (hook) => {
    try {
      const response = await fetch(hook.url, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Ayeba-Webhooks/1.0", "x-ayeba-signature": signature(hook.secret_hash, body) },
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Webhook HTTP ${response.status}`);
      db.prepare("UPDATE developer_webhooks SET failure_count = 0, last_delivery_at = ? WHERE id = ?").run(new Date().toISOString(), hook.id);
    } catch (error) {
      console.error("[webhook delivery]", hook.id, error);
      db.prepare("UPDATE developer_webhooks SET failure_count = failure_count + 1, last_delivery_at = ? WHERE id = ?").run(new Date().toISOString(), hook.id);
    }
  }));
}
