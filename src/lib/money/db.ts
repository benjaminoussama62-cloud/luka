/**
 * Ayeba Mbongo — couche d'accès DB pour le grand livre.
 *
 * Deux implémentations réelles, une seule interface :
 *  - local / vercel-tmp : better-sqlite3 (transactions BEGIN IMMEDIATE)
 *  - turso              : @libsql/client async — transaction("write") donne de
 *    vraies transactions SQLite côté serveur SANS bloquer l'event loop
 *    (le driver sync `libsql` ferait un appel HTTP bloquant par statement).
 *  - memory             : fail CLOSED — un ledger ne simule jamais.
 *
 * Toutes les mutations passent par transaction() qui sérialise les écritures
 * (file d'attente par process) : deux opérations ne peuvent JAMAIS
 * s'entrelacer entre BEGIN et COMMIT, quelle que soit l'implémentation.
 */
import { getDb, getDbMode, type AyebaDatabase } from "@/lib/storage/database";
import { MONEY_SCHEMA } from "./money-schema";

export class MoneyStorageError extends Error {
  constructor() {
    super("Stockage Money indisponible — base de données requise");
    this.name = "MoneyStorageError";
  }
}

/** Levée dans un callback de transaction pour annuler proprement. */
export class TxRollback extends Error {
  readonly value: unknown;
  constructor(value: unknown) {
    super("rollback");
    this.value = value;
  }
}

export type MoneyStmtResult = { changes: number };
export type MoneyRow = Record<string, unknown>;

/** Surface minimale d'une transaction (et de la connexion hors tx). */
export interface MoneyDb {
  run(sql: string, params?: unknown[]): Promise<MoneyStmtResult>;
  get(sql: string, params?: unknown[]): Promise<MoneyRow | undefined>;
  all(sql: string, params?: unknown[]): Promise<MoneyRow[]>;
  /** Corps exécuté atomiquement ; throw → ROLLBACK ; TxRollback → ROLLBACK+value. */
  transaction<T>(fn: (tx: MoneyDb) => Promise<T>): Promise<T>;
}

function normArgs(params: unknown[] | undefined): unknown[] {
  return (params ?? []).map((p) =>
    p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p,
  );
}

// ── better-sqlite3 (local / vercel-tmp) ─────────────────────────────

class SqliteMoneyDb implements MoneyDb {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private db: AyebaDatabase) {}

  async run(sql: string, params?: unknown[]): Promise<MoneyStmtResult> {
    return this.db.prepare(sql).run(...normArgs(params)) as MoneyStmtResult;
  }
  async get(sql: string, params?: unknown[]): Promise<MoneyRow | undefined> {
    return this.db.prepare(sql).get(...normArgs(params)) as MoneyRow | undefined;
  }
  async all(sql: string, params?: unknown[]): Promise<MoneyRow[]> {
    return this.db.prepare(sql).all(...normArgs(params)) as MoneyRow[];
  }

  /**
   * Sérialisation applicative : sur une connexion unique better-sqlite3, deux
   * coroutines async pourraient entrelacer leurs statements entre BEGIN et
   * COMMIT. La file garantit qu'un corps de transaction s'exécute seul.
   */
  transaction<T>(fn: (tx: MoneyDb) => Promise<T>): Promise<T> {
    const p = this.queue.then(() => this.runTx(fn));
    this.queue = p.catch(() => {});
    return p;
  }

  private async runTx<T>(fn: (tx: MoneyDb) => Promise<T>): Promise<T> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const v = await fn(this);
      this.db.exec("COMMIT");
      return v;
    } catch (e) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* déjà rollback */
      }
      if (e instanceof TxRollback) return e.value as T;
      throw e;
    }
  }
}

// ── Turso (@libsql/client — async, non-bloquant) ────────────────────

type LibsqlClient = {
  execute(req: { sql: string; args: unknown[] }): Promise<{
    rowsAffected: number;
    rows: Array<Record<string, unknown>>;
  }>;
  batch(reqs: Array<{ sql: string; args: unknown[] }>): Promise<unknown>;
  transaction(mode: "write" | "read"): Promise<{
    execute(req: { sql: string; args: unknown[] }): Promise<{
      rowsAffected: number;
      rows: Array<Record<string, unknown>>;
    }>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    close(): void;
  }>;
};

class TursoMoneyDb implements MoneyDb {
  private queue: Promise<unknown> = Promise.resolve();
  private schemaReady = false;

  constructor(private client: LibsqlClient) {}

  async run(sql: string, params?: unknown[]): Promise<MoneyStmtResult> {
    const r = await this.client.execute({ sql, args: normArgs(params) });
    return { changes: r.rowsAffected };
  }
  async get(sql: string, params?: unknown[]): Promise<MoneyRow | undefined> {
    const r = await this.client.execute({ sql, args: normArgs(params) });
    return r.rows[0];
  }
  async all(sql: string, params?: unknown[]): Promise<MoneyRow[]> {
    const r = await this.client.execute({ sql, args: normArgs(params) });
    return r.rows;
  }

  async transaction<T>(fn: (tx: MoneyDb) => Promise<T>): Promise<T> {
    const p = this.queue.then(() => this.runTx(fn));
    this.queue = p.catch(() => {});
    return p;
  }

  private async runTx<T>(fn: (tx: MoneyDb) => Promise<T>): Promise<T> {
    const tx = await this.client.transaction("write");
    const view: MoneyDb = {
      run: async (sql, params) => {
        const r = await tx.execute({ sql, args: normArgs(params) });
        return { changes: r.rowsAffected };
      },
      get: async (sql, params) => {
        const r = await tx.execute({ sql, args: normArgs(params) });
        return r.rows[0];
      },
      all: async (sql, params) => {
        const r = await tx.execute({ sql, args: normArgs(params) });
        return r.rows;
      },
      transaction: () => Promise.reject(new Error("nested tx")),
    };
    try {
      const v = await fn(view);
      await tx.commit();
      return v;
    } catch (e) {
      try {
        await tx.rollback();
      } catch {
        /* tx déjà fermée */
      }
      if (e instanceof TxRollback) return e.value as T;
      throw e;
    }
  }

  /** Schéma money via batch async — jamais sur le driver sync (bloquant). */
  async ensureSchema() {
    if (this.schemaReady) return;
    const stmts = MONEY_SCHEMA.split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((sql) => ({ sql, args: [] as unknown[] }));
    await this.client.batch(stmts).catch((e) => {
      console.warn("[money] turso schema batch partial:", (e as Error).message);
    });
    this.schemaReady = true;
  }
}

// ── Résolution ──────────────────────────────────────────────────────

let _moneyDb: MoneyDb | null = null;
let _tursoDb: TursoMoneyDb | null = null;

/**
 * Retourne la couche Money du mode actif, ou null en mode "memory"
 * (serverless sans Turso) — le ledger refuse alors toute opération.
 */
export async function moneyDb(): Promise<MoneyDb> {
  if (_moneyDb) return _moneyDb;
  const mode = getDbMode();
  if (mode === "memory") {
    throw new MoneyStorageError();
  }
  if (mode === "turso") {
    const { createClient } = await import("@libsql/client");
    const url = (process.env.TURSO_DATABASE_URL || "")
      .trim()
      .replace(/^['"]|['"]$/g, "")
      .replace(/^libsql:/, "https:");
    const authToken = (process.env.TURSO_AUTH_TOKEN || "").trim().replace(/^['"]|['"]$/g, "");
    const client = createClient({
      url,
      authToken: authToken || undefined,
    }) as unknown as LibsqlClient;
    _tursoDb = new TursoMoneyDb(client);
    await _tursoDb.ensureSchema();
    _moneyDb = _tursoDb;
    return _moneyDb;
  }
  // local / vercel-tmp : better-sqlite3 sous-jacent (déjà migré par getDb).
  _moneyDb = new SqliteMoneyDb(getDb());
  return _moneyDb;
}

/** Pour les tests : réinitialise la résolution (changement de DB entre suites). */
export function _resetMoneyDb() {
  _moneyDb = null;
  _tursoDb = null;
}
