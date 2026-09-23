import { createHash, randomBytes, randomUUID } from "crypto";
import { getDb } from "@/lib/storage/database";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DeveloperProject = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  apiKeys: number;
  oauthClients: number;
};

export type ApiKeyRestrictions = {
  referrers?: string[];
  ips?: string[];
};

export type DeveloperApiKey = {
  id: string;
  projectId: string;
  name: string;
  prefix: string;
  scopes: string[];
  restrictions: ApiKeyRestrictions;
  quotaPerDay: number;
  usedToday: number;
  status: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ApiLogEntry = {
  id: number;
  keyId: string;
  keyName: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  ip: string;
  createdAt: string;
};

export { API_SCOPES } from "@/lib/developers/catalog";
import { API_SCOPES } from "@/lib/developers/catalog";

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

function toProject(row: ProjectRow): DeveloperProject {
  const db = getDb();
  const keys = db
    .prepare("SELECT COUNT(*) AS c FROM developer_api_keys WHERE project_id = ? AND status != 'revoked'")
    .get(row.id) as { c: number };
  const clients = db
    .prepare("SELECT COUNT(*) AS c FROM oauth_clients WHERE project_id = ?")
    .get(row.id) as { c: number };
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    apiKeys: keys.c,
    oauthClients: clients.c,
  };
}

export function listProjects(ownerUserId: string): DeveloperProject[] {
  const rows = getDb()
    .prepare("SELECT * FROM developer_projects WHERE owner_user_id = ? ORDER BY created_at DESC")
    .all(ownerUserId) as ProjectRow[];
  return rows.map(toProject);
}

export function getProject(projectId: string, ownerUserId: string): DeveloperProject | null {
  const row = getDb()
    .prepare("SELECT * FROM developer_projects WHERE id = ? AND owner_user_id = ?")
    .get(projectId, ownerUserId) as ProjectRow | undefined;
  return row ? toProject(row) : null;
}

export function createProject(ownerUserId: string, name: string): DeveloperProject {
  const db = getDb();
  const id = `prj_${randomUUID().slice(0, 8)}`;
  db.prepare(
    "INSERT INTO developer_projects (id, owner_user_id, name, status, created_at) VALUES (?, ?, ?, 'active', ?)",
  ).run(id, ownerUserId, name.trim(), new Date().toISOString());
  return getProject(id, ownerUserId)!;
}

export function updateProjectName(
  projectId: string,
  ownerUserId: string,
  name: string,
): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return false;
  const res = getDb()
    .prepare("UPDATE developer_projects SET name = ? WHERE id = ? AND owner_user_id = ?")
    .run(trimmed, projectId, ownerUserId) as { changes?: number };
  return (res?.changes ?? 0) > 0;
}

/** Rôle d'un utilisateur sur un projet : owner > editor > viewer. */
export function projectAccess(
  projectId: string,
  userId: string,
): "owner" | "editor" | "viewer" | null {
  const db = getDb();
  const own = db
    .prepare("SELECT 1 AS x FROM developer_projects WHERE id = ? AND owner_user_id = ?")
    .get(projectId, userId);
  if (own) return "owner";
  const m = db
    .prepare("SELECT role FROM developer_project_members WHERE project_id = ? AND user_id = ?")
    .get(projectId, userId) as { role: string } | undefined;
  if (m?.role === "editor") return "editor";
  if (m) return "viewer";
  return null;
}

/** Projets visibles : ceux possédés + ceux où l'utilisateur est membre. */
export function listAccessibleProjects(ownerUserId: string) {
  const db = getDb();
  const owned = db
    .prepare("SELECT * FROM developer_projects WHERE owner_user_id = ? ORDER BY created_at DESC")
    .all(ownerUserId) as ProjectRow[];
  const member = db
    .prepare(
      `SELECT p.*, m.role AS member_role FROM developer_projects p
       JOIN developer_project_members m ON m.project_id = p.id
       WHERE m.user_id = ? ORDER BY p.created_at DESC`,
    )
    .all(ownerUserId) as (ProjectRow & { member_role: string })[];
  return {
    owned: owned.map(toProject),
    member: member.map((r) => ({ ...toProject(r), memberRole: r.member_role })),
  };
}

export type ProjectMember = {
  projectId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  invitedBy: string;
  createdAt: string;
};

export function listMembers(projectId: string): ProjectMember[] {
  const rows = getDb()
    .prepare(
      `SELECT m.project_id, m.user_id, m.role, m.invited_by, m.created_at,
              u.email, u.name
       FROM developer_project_members m JOIN users u ON u.id = m.user_id
       WHERE m.project_id = ? ORDER BY m.created_at ASC`,
    )
    .all(projectId) as Array<{
    project_id: string; user_id: string; role: string; invited_by: string;
    created_at: string; email: string; name: string;
  }>;
  return rows.map((r) => ({
    projectId: r.project_id,
    userId: r.user_id,
    email: r.email,
    name: r.name,
    role: r.role,
    invitedBy: r.invited_by,
    createdAt: r.created_at,
  }));
}

export function addMemberByEmail(
  projectId: string,
  ownerUserId: string,
  email: string,
  role: "viewer" | "editor",
): { ok: true; member: ProjectMember } | { error: string } {
  const db = getDb();
  if (projectAccess(projectId, ownerUserId) !== "owner") {
    return { error: "Seul le propriétaire gère les membres" };
  }
  const target = db
    .prepare("SELECT id, email, name FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as { id: string; email: string; name: string } | undefined;
  if (!target) {
    return { error: "Aucun compte Ayeba avec cet email — la personne doit d'abord créer un compte" };
  }
  if (target.id === ownerUserId) return { error: "Vous êtes déjà propriétaire" };
  db.prepare(
    `INSERT INTO developer_project_members (project_id, user_id, role, invited_by, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role`,
  ).run(projectId, target.id, role, ownerUserId, new Date().toISOString());
  return {
    ok: true,
    member: {
      projectId, userId: target.id, email: target.email, name: target.name,
      role, invitedBy: ownerUserId, createdAt: new Date().toISOString(),
    },
  };
}

export function removeMember(projectId: string, ownerUserId: string, userId: string): boolean {
  const res = getDb()
    .prepare("DELETE FROM developer_project_members WHERE project_id = ? AND user_id = ?")
    .run(projectId, userId) as { changes?: number };
  void ownerUserId;
  return (res?.changes ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* APIs activées par projet                                            */
/* ------------------------------------------------------------------ */

export function listEnabledApis(projectId: string): string[] {
  const rows = getDb()
    .prepare("SELECT api_id FROM developer_project_apis WHERE project_id = ? AND status = 'enabled'")
    .all(projectId) as { api_id: string }[];
  return rows.map((r) => r.api_id);
}

export function setApiEnabled(
  projectId: string,
  apiId: string,
  enabled: boolean,
  byUserId = "",
): boolean {
  const db = getDb();
  if (enabled) {
    db.prepare(
      `INSERT INTO developer_project_apis (project_id, api_id, status, enabled_by, created_at)
       VALUES (?, ?, 'enabled', ?, ?)
       ON CONFLICT(project_id, api_id) DO UPDATE SET status = 'enabled'`,
    ).run(projectId, apiId, byUserId, new Date().toISOString());
  } else {
    db.prepare(
      "UPDATE developer_project_apis SET status = 'disabled' WHERE project_id = ? AND api_id = ?",
    ).run(projectId, apiId);
  }
  return true;
}

export function deleteProject(projectId: string, ownerUserId: string): boolean {
  const db = getDb();
  const project = getProject(projectId, ownerUserId);
  if (!project) return false;
  // Detach OAuth clients and revoke keys — never silently drop credentials.
  db.prepare("UPDATE oauth_clients SET project_id = NULL WHERE project_id = ?").run(projectId);
  db.prepare(
    "UPDATE developer_api_keys SET status = 'revoked' WHERE project_id = ?",
  ).run(projectId);
  db.prepare("DELETE FROM developer_projects WHERE id = ?").run(projectId);
  return true;
}

/* ------------------------------------------------------------------ */
/* API keys                                                            */
/* ------------------------------------------------------------------ */

type KeyRow = {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  api_scopes: string;
  restrictions_json: string;
  quota_per_day: number;
  status: string;
  created_at: string;
  last_used_at: string | null;
};

function dayStart(): string {
  return new Date().toISOString().slice(0, 10);
}

function toKey(row: KeyRow): DeveloperApiKey {
  const used = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM developer_api_logs WHERE key_id = ? AND created_at >= ?",
    )
    .get(row.id, dayStart()) as { c: number };
  let scopes: string[] = [];
  let restrictions: ApiKeyRestrictions = {};
  try {
    scopes = JSON.parse(row.api_scopes) as string[];
  } catch { /* keep */ }
  try {
    restrictions = JSON.parse(row.restrictions_json) as ApiKeyRestrictions;
  } catch { /* keep */ }
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    prefix: row.key_prefix,
    scopes,
    restrictions,
    quotaPerDay: row.quota_per_day,
    usedToday: used.c,
    status: row.status,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

export function listApiKeys(ownerUserId: string, projectId?: string): DeveloperApiKey[] {
  const db = getDb();
  const rows = (
    projectId
      ? db
          .prepare(
            "SELECT * FROM developer_api_keys WHERE owner_user_id = ? AND project_id = ? ORDER BY created_at DESC",
          )
          .all(ownerUserId, projectId)
      : db
          .prepare(
            "SELECT * FROM developer_api_keys WHERE owner_user_id = ? ORDER BY created_at DESC",
          )
          .all(ownerUserId)
  ) as KeyRow[];
  return rows.map(toKey);
}

export function createApiKey(
  ownerUserId: string,
  projectId: string,
  input: {
    name: string;
    scopes?: string[];
    restrictions?: ApiKeyRestrictions;
    quotaPerDay?: number;
  },
): { key: DeveloperApiKey; secret: string } | null {
  const db = getDb();
  const role = projectAccess(projectId, ownerUserId);
  if (role !== "owner" && role !== "editor") return null;

  const id = `key_${randomUUID().slice(0, 8)}`;
  const secret = `ayb_live_${randomBytes(24).toString("hex")}`;
  const scopes = (input.scopes?.length ? input.scopes : ["search"]).filter((s) =>
    API_SCOPES.some((a) => a.id === s),
  );
  db.prepare(
    `INSERT INTO developer_api_keys
     (id, project_id, owner_user_id, name, key_prefix, key_hash, api_scopes, restrictions_json, quota_per_day, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).run(
    id,
    projectId,
    ownerUserId,
    input.name.trim(),
    secret.slice(0, 17),
    createHash("sha256").update(secret).digest("hex"),
    JSON.stringify(scopes.length ? scopes : ["search"]),
    JSON.stringify(input.restrictions || {}),
    Math.max(1, Math.min(1_000_000, input.quotaPerDay || 1000)),
    new Date().toISOString(),
  );
  const row = db.prepare("SELECT * FROM developer_api_keys WHERE id = ?").get(id) as KeyRow;
  return { key: toKey(row), secret };
}

export function updateApiKey(
  keyId: string,
  ownerUserId: string,
  patch: {
    name?: string;
    restrictions?: ApiKeyRestrictions;
    quotaPerDay?: number;
    status?: "active" | "disabled";
  },
): DeveloperApiKey | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM developer_api_keys WHERE id = ?")
    .get(keyId) as KeyRow | undefined;
  if (!row || row.status === "revoked") return null;
  const role = projectAccess(row.project_id, ownerUserId);
  if (role !== "owner" && role !== "editor") return null;
  db.prepare(
    `UPDATE developer_api_keys SET
       name = ?, restrictions_json = ?, quota_per_day = ?, status = ?
     WHERE id = ?`,
  ).run(
    patch.name ?? row.name,
    patch.restrictions !== undefined ? JSON.stringify(patch.restrictions) : row.restrictions_json,
    Math.max(1, Math.min(1_000_000, patch.quotaPerDay ?? row.quota_per_day)),
    patch.status ?? row.status,
    keyId,
  );
  return toKey(
    db.prepare("SELECT * FROM developer_api_keys WHERE id = ?").get(keyId) as KeyRow,
  );
}

export function revokeApiKey(keyId: string, ownerUserId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT project_id FROM developer_api_keys WHERE id = ?")
    .get(keyId) as { project_id: string } | undefined;
  if (!row) return false;
  const role = projectAccess(row.project_id, ownerUserId);
  if (role !== "owner" && role !== "editor") return false;
  const res = db
    .prepare(
      "UPDATE developer_api_keys SET status = 'revoked' WHERE id = ? AND status != 'revoked'",
    )
    .run(keyId) as { changes?: number } | undefined;
  return (res?.changes ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Public-key validation (used by /api/v1/*)                            */
/* ------------------------------------------------------------------ */

export type KeyValidation =
  | { ok: true; keyId: string; projectId: string; scopes: string[] }
  | { ok: false; status: number; error: string };

/**
 * Validates a presented API key against hash, status, daily quota and
 * restrictions, then logs the call. Every /api/v1/* endpoint goes through this.
 */
export function validateApiKey(
  presented: string | null,
  requiredScope: string,
  req: Request,
  endpoint: string,
): KeyValidation {
  const db = getDb();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const finish = (
    keyId: string,
    projectId: string,
    code: number,
    latencyStart: number,
  ) => {
    db.prepare(
      "INSERT INTO developer_api_logs (key_id, project_id, endpoint, status_code, latency_ms, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      keyId,
      projectId,
      endpoint,
      code,
      Date.now() - latencyStart,
      ip,
      new Date().toISOString(),
    );
    db.prepare("UPDATE developer_api_keys SET last_used_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      keyId,
    );
  };

  if (!presented || !presented.startsWith("ayb_")) {
    return { ok: false, status: 401, error: "Clé API requise (en-tête Authorization: Bearer ou ?key=)" };
  }
  const started = Date.now();
  const hash = createHash("sha256").update(presented).digest("hex");
  const row = db
    .prepare("SELECT * FROM developer_api_keys WHERE key_hash = ?")
    .get(hash) as (KeyRow & { owner_user_id: string }) | undefined;
  if (!row) return { ok: false, status: 401, error: "Clé API invalide" };

  if (row.status !== "active") {
    finish(row.id, row.project_id, 403, started);
    return { ok: false, status: 403, error: "Clé désactivée ou révoquée" };
  }

  let scopes: string[] = [];
  let restrictions: ApiKeyRestrictions = {};
  try { scopes = JSON.parse(row.api_scopes) as string[]; } catch { /* */ }
  try { restrictions = JSON.parse(row.restrictions_json) as ApiKeyRestrictions; } catch { /* */ }

  if (!scopes.includes(requiredScope)) {
    finish(row.id, row.project_id, 403, started);
    return { ok: false, status: 403, error: `Cette clé n'a pas la portée "${requiredScope}"` };
  }

  if (restrictions.referrers?.length) {
    const ref = req.headers.get("referer") || req.headers.get("origin") || "";
    const host = ref ? new URL(ref).hostname : "";
    const allowed = restrictions.referrers.some(
      (r) => host === r || host.endsWith(`.${r}`) || r === "*",
    );
    if (!allowed) {
      finish(row.id, row.project_id, 403, started);
      return { ok: false, status: 403, error: "Référent non autorisé pour cette clé" };
    }
  }
  if (restrictions.ips?.length && ip && !restrictions.ips.includes(ip)) {
    finish(row.id, row.project_id, 403, started);
    return { ok: false, status: 403, error: "Adresse IP non autorisée pour cette clé" };
  }

  const used = db
    .prepare(
      "SELECT COUNT(*) AS c FROM developer_api_logs WHERE key_id = ? AND status_code = 200 AND created_at >= ?",
    )
    .get(row.id, dayStart()) as { c: number };
  if (used.c >= row.quota_per_day) {
    finish(row.id, row.project_id, 429, started);
    return { ok: false, status: 429, error: "Quota quotidien dépassé" };
  }

  return { ok: true, keyId: row.id, projectId: row.project_id, scopes };
}

/** Log a successful /api/v1 call (called after the response is built). */
export function logApiCall(keyId: string, projectId: string, endpoint: string, latencyStart: number, ip: string) {
  const db = getDb();
  db.prepare(
    "INSERT INTO developer_api_logs (key_id, project_id, endpoint, status_code, latency_ms, ip, created_at) VALUES (?, ?, ?, 200, ?, ?, ?)",
  ).run(keyId, projectId, endpoint, Date.now() - latencyStart, ip, new Date().toISOString());
  db.prepare("UPDATE developer_api_keys SET last_used_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    keyId,
  );
}

/* ------------------------------------------------------------------ */
/* Usage metrics + logs                                                */
/* ------------------------------------------------------------------ */

export function getUsage(ownerUserId: string, projectId: string | null, days: number) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const where = projectId ? "AND l.project_id = ?" : "";
  const params = projectId ? [ownerUserId, since, projectId] : [ownerUserId, since];
  const base = `FROM developer_api_logs l JOIN developer_api_keys k ON k.id = l.key_id
     WHERE k.owner_user_id = ? AND l.created_at >= ? ${where}`;

  const daily = db
    .prepare(
      `SELECT substr(l.created_at, 1, 10) AS day, COUNT(*) AS calls,
              SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS errors,
              AVG(l.latency_ms) AS avg_latency
       ${base} GROUP BY day ORDER BY day`,
    )
    .all(...params) as { day: string; calls: number; errors: number; avg_latency: number }[];

  const byEndpoint = db
    .prepare(`SELECT l.endpoint, COUNT(*) AS calls ${base} GROUP BY l.endpoint ORDER BY calls DESC`)
    .all(...params) as { endpoint: string; calls: number }[];

  const byKey = db
    .prepare(`SELECT k.name, k.key_prefix, COUNT(*) AS calls ${base} GROUP BY l.key_id ORDER BY calls DESC`)
    .all(...params) as { name: string; key_prefix: string; calls: number }[];

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS calls,
              SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS errors,
              AVG(l.latency_ms) AS avg_latency ${base}`,
    )
    .get(...params) as { calls: number; errors: number | null; avg_latency: number | null };

  return {
    totals: {
      calls: totals.calls,
      errors: totals.errors || 0,
      avgLatencyMs: Math.round(totals.avg_latency || 0),
    },
    daily,
    byEndpoint,
    byKey,
  };
}

/** Usage d'un projet précis — accessible aux membres (pas seulement owner). */
export function getUsageForProject(projectId: string, days: number) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const base = `FROM developer_api_logs l WHERE l.project_id = ? AND l.created_at >= ?`;

  const daily = db
    .prepare(
      `SELECT substr(l.created_at, 1, 10) AS day, COUNT(*) AS calls,
              SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS errors,
              AVG(l.latency_ms) AS avg_latency
       ${base} GROUP BY day ORDER BY day`,
    )
    .all(projectId, since) as { day: string; calls: number; errors: number; avg_latency: number }[];

  const byEndpoint = db
    .prepare(`SELECT l.endpoint, COUNT(*) AS calls ${base} GROUP BY l.endpoint ORDER BY calls DESC`)
    .all(projectId, since) as { endpoint: string; calls: number }[];

  const byKey = db
    .prepare(
      `SELECT k.name, k.key_prefix, COUNT(*) AS calls
       FROM developer_api_logs l LEFT JOIN developer_api_keys k ON k.id = l.key_id
       WHERE l.project_id = ? AND l.created_at >= ?
       GROUP BY l.key_id ORDER BY calls DESC`,
    )
    .all(projectId, since) as { name: string | null; key_prefix: string | null; calls: number }[];

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS calls,
              SUM(CASE WHEN l.status_code >= 400 THEN 1 ELSE 0 END) AS errors,
              AVG(l.latency_ms) AS avg_latency ${base}`,
    )
    .get(projectId, since) as { calls: number; errors: number | null; avg_latency: number | null };

  const byStatus = db
    .prepare(
      `SELECT l.status_code AS code, COUNT(*) AS calls ${base} GROUP BY l.status_code ORDER BY calls DESC`,
    )
    .all(projectId, since) as { code: number; calls: number }[];

  return {
    totals: {
      calls: totals.calls,
      errors: totals.errors || 0,
      avgLatencyMs: Math.round(totals.avg_latency || 0),
    },
    daily,
    byEndpoint,
    byKey,
    byStatus,
  };
}

export function getLogsForProject(projectId: string, limit = 100): ApiLogEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT l.*, k.name AS key_name FROM developer_api_logs l
       LEFT JOIN developer_api_keys k ON k.id = l.key_id
       WHERE l.project_id = ? ORDER BY l.id DESC LIMIT ?`,
    )
    .all(projectId, limit) as (ApiLogEntry & {
    key_name: string | null; key_id: string; status_code: number; latency_ms: number; created_at: string;
  })[];
  return rows.map((r) => ({
    id: r.id,
    keyId: r.key_id,
    keyName: r.key_name || (r.key_id === "console" ? "Console (explorateur)" : r.key_id),
    endpoint: r.endpoint,
    statusCode: r.status_code,
    latencyMs: r.latency_ms,
    ip: r.ip,
    createdAt: r.created_at,
  }));
}

/** Clés d'un projet — visibles par les membres (secrets jamais exposés). */
export function listProjectApiKeys(projectId: string): DeveloperApiKey[] {
  const rows = getDb()
    .prepare(
      "SELECT * FROM developer_api_keys WHERE project_id = ? ORDER BY created_at DESC",
    )
    .all(projectId) as KeyRow[];
  return rows.map(toKey);
}

export function getLogs(ownerUserId: string, projectId: string | null, limit = 100): ApiLogEntry[] {
  const db = getDb();
  const rows = (
    projectId
      ? db
          .prepare(
            `SELECT l.*, k.name AS key_name FROM developer_api_logs l
             JOIN developer_api_keys k ON k.id = l.key_id
             WHERE k.owner_user_id = ? AND l.project_id = ?
             ORDER BY l.id DESC LIMIT ?`,
          )
          .all(ownerUserId, projectId, limit)
      : db
          .prepare(
            `SELECT l.*, k.name AS key_name FROM developer_api_logs l
             JOIN developer_api_keys k ON k.id = l.key_id
             WHERE k.owner_user_id = ?
             ORDER BY l.id DESC LIMIT ?`,
          )
          .all(ownerUserId, limit)
  ) as (ApiLogEntry & { key_name: string; key_id: string; status_code: number; latency_ms: number; created_at: string })[];
  return rows.map((r) => ({
    id: r.id,
    keyId: r.key_id,
    keyName: r.key_name,
    endpoint: r.endpoint,
    statusCode: r.status_code,
    latencyMs: r.latency_ms,
    ip: r.ip,
    createdAt: r.created_at,
  }));
}

/** Console overview: totals + per-project rollup + OAuth audit activity. */
export function getConsoleOverview(ownerUserId: string) {
  const db = getDb();
  const projects = listProjects(ownerUserId);
  const keys = listApiKeys(ownerUserId);
  const month = getUsage(ownerUserId, null, 30);
  const audit = db
    .prepare(
      `SELECT event_type, client_id, detail, created_at FROM oauth_audit_log
       WHERE client_id IN (SELECT client_id FROM oauth_clients WHERE owner_user_id = ?)
       ORDER BY id DESC LIMIT 20`,
    )
    .all(ownerUserId) as { event_type: string; client_id: string; detail: string; created_at: string }[];
  return { projects, keys, month, audit };
}
