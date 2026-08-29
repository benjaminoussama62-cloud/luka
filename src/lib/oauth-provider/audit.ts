import { getDb } from "@/lib/storage/database";

export type OAuthAuditEvent =
  | "authorize_start"
  | "authorize_denied"
  | "authorize_granted"
  | "token_issued"
  | "token_refreshed"
  | "token_revoked"
  | "consent_revoked"
  | "client_created"
  | "client_verified"
  | "login_failed"
  | "login_success";

export function logOAuthAudit(input: {
  event: OAuthAuditEvent;
  clientId?: string;
  userId?: string;
  ip?: string;
  detail?: string;
}) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO oauth_audit_log (event_type, client_id, user_id, ip, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      input.event,
      input.clientId || null,
      input.userId || null,
      input.ip || null,
      input.detail || "",
      new Date().toISOString(),
    );
  } catch (e) {
    console.error("[oauth/audit]", e);
  }
}

export function listAuditForClient(clientId: string, limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT event_type, user_id, ip, detail, created_at
       FROM oauth_audit_log WHERE client_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(clientId, limit) as {
    event_type: string;
    user_id: string | null;
    ip: string | null;
    detail: string;
    created_at: string;
  }[];
}
