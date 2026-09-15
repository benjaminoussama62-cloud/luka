import { getDb } from "@/lib/storage/database";

export function recordDeveloperRequest(clientId: string, status: number, latencyMs: number) {
  const day = new Date().toISOString().slice(0, 10);
  getDb().prepare(
    `INSERT INTO developer_usage_daily (client_id, day, requests, errors, latency_ms)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(client_id, day) DO UPDATE SET requests = requests + 1, errors = errors + excluded.errors, latency_ms = latency_ms + excluded.latency_ms`,
  ).run(clientId, day, status >= 400 ? 1 : 0, Math.max(0, Math.round(latencyMs)));
}

export function getDeveloperAnalytics(clientId: string, userId: string, days = 30) {
  const owner = getDb().prepare("SELECT owner_user_id FROM oauth_clients WHERE client_id = ?").get(clientId) as { owner_user_id: string } | undefined;
  if (!owner || owner.owner_user_id !== userId) return null;
  const since = new Date(Date.now() - Math.min(days, 90) * 86400000).toISOString().slice(0, 10);
  return getDb().prepare(
    "SELECT day, requests, errors, latency_ms FROM developer_usage_daily WHERE client_id = ? AND day >= ? ORDER BY day",
  ).all(clientId, since);
}
