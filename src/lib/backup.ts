/**
 * Backups — snapshots des tables critiques, gzippés, rotation 30 jours.
 *
 * Portée : restauration applicative (table corrompue/supprimée par erreur) et
 * audit. Pour la perte totale Turso : `turso db export` + docs/disaster-recovery.md.
 *
 * Les tables volumineuses (crawl, fts, mail_messages) sont exclues — elles se
 * reconstruisent. On sauvegarde ce qui est IRREMPLAÇABLE : comptes, rôles,
 * paiements, sites, clés.
 */
import zlib from "zlib";
import { getDb } from "@/lib/storage/database";

const CRITICAL_TABLES = [
  "users",
  "user_preferences",
  "mail_accounts",
  "admin_users",
  "admin_sessions",
  "oauth_clients",
  "developer_apps",
  "developer_api_keys",
  "studio_sites",
  "payment_intents",
  "subscriptions",
  "invoices",
];

const MAX_ROWS_PER_TABLE = 50_000;
const RETENTION_DAYS = 30;

function ensureSchema() {
  getDb()
    .prepare(
      `CREATE TABLE IF NOT EXISTS backup_snapshots (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        tables_json TEXT NOT NULL,
        row_counts TEXT NOT NULL,
        size_bytes INTEGER NOT NULL
      )`,
    )
    .run();
}

function tableExists(name: string): boolean {
  const r = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
  return Boolean(r);
}

export function createBackupSnapshot(): {
  id: string;
  tables: Record<string, number>;
  sizeBytes: number;
} {
  ensureSchema();
  const db = getDb();
  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of CRITICAL_TABLES) {
    if (!tableExists(table)) continue;
    const rows = db
      .prepare(`SELECT * FROM "${table}" ORDER BY rowid DESC LIMIT ?`)
      .all(MAX_ROWS_PER_TABLE) as unknown[];
    dump[table] = rows;
    counts[table] = rows.length;
  }

  const gz = zlib.gzipSync(Buffer.from(JSON.stringify(dump), "utf8"), { level: 9 });
  const id = `bk-${Date.now().toString(36)}`;
  db.prepare(
    "INSERT INTO backup_snapshots (id, created_at, tables_json, row_counts, size_bytes) VALUES (?, ?, ?, ?, ?)",
  ).run(id, new Date().toISOString(), gz.toString("base64"), JSON.stringify(counts), gz.length);

  // Rotation : garder RETENTION_DAYS jours max.
  db.prepare(
    "DELETE FROM backup_snapshots WHERE created_at < ?",
  ).run(new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString());

  return { id, tables: counts, sizeBytes: gz.length };
}

export function listBackups(): Array<{
  id: string;
  createdAt: string;
  rowCounts: Record<string, number>;
  sizeBytes: number;
}> {
  ensureSchema();
  const rows = getDb()
    .prepare("SELECT id, created_at, row_counts, size_bytes FROM backup_snapshots ORDER BY created_at DESC LIMIT 60")
    .all() as Array<{ id: string; created_at: string; row_counts: string; size_bytes: number }>;
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    rowCounts: JSON.parse(r.row_counts),
    sizeBytes: r.size_bytes,
  }));
}

/** Restaure les tables d'un snapshot (INSERT OR REPLACE — n'écrase pas le schéma). */
export function restoreBackup(id: string): { restored: Record<string, number> } {
  ensureSchema();
  const row = getDb()
    .prepare("SELECT tables_json FROM backup_snapshots WHERE id = ?")
    .get(id) as { tables_json: string } | undefined;
  if (!row) throw new Error(`Snapshot ${id} introuvable`);
  const dump = JSON.parse(
    zlib.gunzipSync(Buffer.from(row.tables_json, "base64")).toString("utf8"),
  ) as Record<string, Array<Record<string, unknown>>>;

  const db = getDb();
  const restored: Record<string, number> = {};
  for (const [table, rows] of Object.entries(dump)) {
    if (!CRITICAL_TABLES.includes(table) || !tableExists(table) || !rows.length) continue;
    const cols = Object.keys(rows[0]);
    const stmt = db.prepare(
      `INSERT OR REPLACE INTO "${table}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`,
    );
    let n = 0;
    for (const r of rows) {
      stmt.run(...cols.map((c) => r[c]));
      n++;
    }
    restored[table] = n;
  }
  return { restored };
}
