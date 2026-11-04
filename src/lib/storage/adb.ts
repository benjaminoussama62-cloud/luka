/**
 * Adaptateur DB asynchrone générique — la porte d'entrée unique pour tout
 * accès SQL hors chemin de recherche (users, oauth, mail, admin…).
 *
 *  - local / vercel-tmp : better-sqlite3 sous-jacent, résultats enveloppés en
 *    Promise — le code appelant est identique sur les deux backends.
 *  - turso : @libsql/client async. JAMAIS le driver sync `libsql` : un appel
 *    HTTP bloquant par statement gèle l'event loop du lambda (~150 ms chacun,
 *    deadlines impossibles, requêtes à 40 s+).
 *  - memory (serverless sans Turso) : fail-closed — lectures vides, écritures
 *    no-op tracées. Aucune ligne fabriquée n'est jamais retournée.
 *
 * transaction() sérialise les écritures par process (file d'attente) : deux
 * corps de transaction ne peuvent JAMAIS s'entrelacer entre BEGIN et COMMIT.
 * Sur Turso, transaction("write") donne une vraie transaction SQLite côté
 * serveur sans bloquer l'event loop.
 */
import type { Client } from "@libsql/client";
import {
  ensureTursoMigrate,
  getDb,
  getDbMode,
  type AyebaDatabase,
} from "./database";

export type AdbRow = Record<string, unknown>;
export type AdbStmtResult = { changes: number };

export interface AdbStmt {
  run(...params: unknown[]): Promise<AdbStmtResult>;
  get(...params: unknown[]): Promise<AdbRow | undefined>;
  all(...params: unknown[]): Promise<AdbRow[]>;
}

export interface Adb {
  prepare(sql: string): AdbStmt;
  run(sql: string, params?: unknown[]): Promise<AdbStmtResult>;
  get(sql: string, params?: unknown[]): Promise<AdbRow | undefined>;
  all(sql: string, params?: unknown[]): Promise<AdbRow[]>;
  /**
   * Multi-statements à tolérance individuelle (schéma, migrations) : un
   * statement en échec n'interrompt pas les suivants — même sémantique que
   * applySchemaStatements.
   */
  exec(sql: string): Promise<void>;
  /** Corps exécuté atomiquement ; throw → ROLLBACK. Jamais imbriqué. */
  transaction<T>(fn: (tx: Adb) => Promise<T>): Promise<T>;
}

function normParams(params: unknown[]): unknown[] {
  return params.map((p) =>
    p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p,
  );
}

// ── Client Turso partagé ────────────────────────────────────────────

let _client: Client | null = null;

function strip(v?: string) {
  return (v ?? "").trim().replace(/^['"]|['"]$/g, "");
}

/** Client async partagé par adb et les helpers de recherche (turso-async). */
export function getAsyncClient(): Client | null {
  if (_client) return _client;
  const raw = strip(process.env.TURSO_DATABASE_URL);
  const authToken = strip(process.env.TURSO_AUTH_TOKEN);
  if (!raw || (!raw.startsWith("libsql://") && !raw.startsWith("https://"))) {
    return null;
  }
  const url = raw.replace(/^libsql:/, "https:");
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require("@libsql/client") as typeof import("@libsql/client");
    _client = createClient({ url, authToken: authToken || undefined });
    // Schéma + seeds en arrière-plan sur ce client async — jamais sur le
    // driver sync (un round trip HTTP bloquant par statement).
    void ensureTursoMigrate();
    return _client;
  } catch {
    return null;
  }
}

// ── better-sqlite3 / stub mémoire (sync → async) ────────────────────

class SqliteAdb implements Adb {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private db: AyebaDatabase) {}

  prepare(sql: string): AdbStmt {
    const stmt = this.db.prepare(sql);
    return {
      run: async (...params) => stmt.run(...normParams(params)) as AdbStmtResult,
      get: async (...params) =>
        stmt.get(...normParams(params)) as AdbRow | undefined,
      all: async (...params) => stmt.all(...normParams(params)) as AdbRow[],
    };
  }

  run(sql: string, params?: unknown[]) {
    return this.prepare(sql).run(...(params ?? []));
  }
  get(sql: string, params?: unknown[]) {
    return this.prepare(sql).get(...(params ?? []));
  }
  all(sql: string, params?: unknown[]) {
    return this.prepare(sql).all(...(params ?? []));
  }

  async exec(sql: string): Promise<void> {
    for (const raw of sql.split(";")) {
      const stmt = raw.trim();
      if (!stmt) continue;
      try {
        this.db.exec(stmt);
      } catch (e) {
        console.warn("[adb] schema statement skipped:", (e as Error).message);
      }
    }
  }

  /**
   * Sérialisation applicative : sur une connexion unique better-sqlite3, deux
   * coroutines async pourraient entrelacer leurs statements entre BEGIN et
   * COMMIT. La file garantit qu'un corps de transaction s'exécute seul.
   */
  transaction<T>(fn: (tx: Adb) => Promise<T>): Promise<T> {
    const p = this.queue.then(() => this.runTx(fn));
    this.queue = p.catch(() => {});
    return p;
  }

  private async runTx<T>(fn: (tx: Adb) => Promise<T>): Promise<T> {
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
      throw e;
    }
  }
}

// ── Turso (@libsql/client — async, non-bloquant) ────────────────────

type LibsqlTx = {
  execute(req: { sql: string; args: unknown[] }): Promise<{
    rowsAffected: number;
    rows: Array<Record<string, unknown>>;
  }>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): void;
};

class TursoAdb implements Adb {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private client: Client) {}

  prepare(sql: string): AdbStmt {
    const exec = (params: unknown[]) =>
      this.client.execute({ sql, args: normParams(params) as never });
    return {
      run: async (...params) => {
        const r = await exec(params);
        return { changes: r.rowsAffected };
      },
      get: async (...params) => (await exec(params)).rows[0] as AdbRow | undefined,
      all: async (...params) => (await exec(params)).rows as AdbRow[],
    };
  }

  run(sql: string, params?: unknown[]) {
    return this.prepare(sql).run(...(params ?? []));
  }
  get(sql: string, params?: unknown[]) {
    return this.prepare(sql).get(...(params ?? []));
  }
  all(sql: string, params?: unknown[]) {
    return this.prepare(sql).all(...(params ?? []));
  }

  async exec(sql: string): Promise<void> {
    const stmts = sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => ({ sql: s, args: [] as unknown[] }));
    if (!stmts.length) return;
    const results = await Promise.allSettled(
      stmts.map((s) => this.client.execute(s as never)),
    );
    for (const r of results) {
      if (r.status === "rejected") {
        console.warn("[adb] schema statement skipped:", (r.reason as Error).message);
      }
    }
  }

  async transaction<T>(fn: (tx: Adb) => Promise<T>): Promise<T> {
    const p = this.queue.then(() => this.runTx(fn));
    this.queue = p.catch(() => {});
    return p;
  }

  private async runTx<T>(fn: (tx: Adb) => Promise<T>): Promise<T> {
    const tx = (await this.client.transaction("write")) as unknown as LibsqlTx;
    const view: Adb = {
      prepare: (sql) => {
        const exec = (params: unknown[]) =>
          tx.execute({ sql, args: normParams(params) as never });
        return {
          run: async (...params) => ({ changes: (await exec(params)).rowsAffected }),
          get: async (...params) => (await exec(params)).rows[0] as AdbRow | undefined,
          all: async (...params) => (await exec(params)).rows as AdbRow[],
        };
      },
      run: (sql, params) => view.prepare(sql).run(...(params ?? [])),
      get: (sql, params) => view.prepare(sql).get(...(params ?? [])),
      all: (sql, params) => view.prepare(sql).all(...(params ?? [])),
      exec: async () => {
        throw new Error("exec indisponible dans une transaction");
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
      throw e;
    }
  }
}

// ── Mode mémoire — fail-closed, jamais de lignes fabriquées ─────────

class MemoryAdb implements Adb {
  private warned = false;
  private stub() {
    if (!this.warned) {
      this.warned = true;
      console.warn(
        "[adb] aucune base durable configurée — écritures ignorées, lectures vides (configurez TURSO_DATABASE_URL)",
      );
    }
  }

  prepare(): AdbStmt {
    return {
      run: async () => {
        this.stub();
        return { changes: 0 };
      },
      get: async () => undefined,
      all: async () => [],
    };
  }

  run() {
    return this.prepare().run();
  }
  get() {
    return this.prepare().get();
  }
  all() {
    return this.prepare().all();
  }
  async exec() {
    this.stub();
  }
  transaction<T>(fn: (tx: Adb) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

// ── Résolution ──────────────────────────────────────────────────────

let _adb: Adb | null = null;
let _adbMode: string | null = null;

/**
 * Adaptateur du mode actif. Synchrone à l'appel — seules les requêtes sont
 * async (createClient @libsql/client est synchrone : pas d'await au wiring).
 * En mode "memory", retourne un adaptateur fail-closed plutôt que de jeter :
 * les lectures vides laissent l'auth refuser proprement.
 */
export function adb(): Adb {
  const mode = getDbMode();
  if (_adb && _adbMode === mode) return _adb;
  _adbMode = mode;
  if (mode === "turso") {
    const client = getAsyncClient();
    _adb = client ? new TursoAdb(client) : new SqliteAdb(getDb());
  } else if (mode === "memory") {
    _adb = new MemoryAdb();
  } else {
    _adb = new SqliteAdb(getDb());
  }
  return _adb;
}

/** Pour les tests : réinitialise l'adaptateur (changement de DB entre suites). */
export function _resetAdb() {
  _adb = null;
  _adbMode = null;
}
