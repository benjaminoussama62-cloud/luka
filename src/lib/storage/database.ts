import { mkdirSync } from "fs";
import path from "path";

/** Minimal surface shared by better-sqlite3 and libsql sync drivers. */
export type AyebaDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown;
  };
  pragma?(sql: string): unknown;
};

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.cwd() === "/var/task",
  );
}

const DATA_DIR = path.join(
  isServerlessRuntime() ? "/tmp" : process.cwd(),
  isServerlessRuntime() ? "ayeba-data" : "data",
);
const LOCAL_DB_PATH = path.join(DATA_DIR, "ayeba.db");

let _db: AyebaDatabase | null = null;
let _dbMode: "turso" | "vercel-tmp" | "memory" | "local" | null = null;

function tursoUrl() {
  const raw = process.env.TURSO_DATABASE_URL?.trim();
  if (!raw) return "";
  // vercel env pull may wrap values in quotes
  const url = raw.replace(/^['"]|['"]$/g, "");
  // Guard against redacted / placeholder values becoming local SQLite files.
  if (!/^libsql:\/\//i.test(url) && !/^https:\/\//i.test(url)) return "";
  return url;
}

export function getDbMode(): "turso" | "vercel-tmp" | "memory" | "local" {
  if (tursoUrl()) return "turso";
  if (isServerlessRuntime()) {
    // Native better-sqlite3 is unreliable on Vercel Hobby without Turso.
    // Prefer an in-memory stub so search (DDG/Wikipedia) still works.
    return process.env.AYEBA_FORCE_SQLITE_TMP === "1" ? "vercel-tmp" : "memory";
  }
  return "local";
}

/** No-op SQL surface — enough for callers that tolerate empty results. */
function createMemoryDb(): AyebaDatabase {
  const emptyStmt = {
    run: () => ({ changes: 0, lastInsertRowid: 0 }),
    // Return count zeros so `.c` / `.n` access during build never throws.
    get: () => ({ c: 0, n: 0, id: undefined, samples: 0, role: "contributor" }),
    all: () => [],
  };
  return {
    exec: () => undefined,
    prepare: () => emptyStmt,
    pragma: () => undefined,
  };
}

export function getDb(): AyebaDatabase {
  if (_db) return _db;

  _dbMode = getDbMode();

  try {
    if (_dbMode === "memory") {
      _db = createMemoryDb();
      return _db;
    }

    if (_dbMode === "turso") {
      // Dynamic require — avoid loading native bindings unless Turso is configured.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Libsql = require("libsql") as typeof import("libsql");
      const url = tursoUrl();
      const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^['"]|['"]$/g, "");
      const opts = authToken ? { authToken } : undefined;
      _db = new Libsql(url, opts as never) as unknown as AyebaDatabase;
      migrate(_db);
      return _db;
    }

    // Local / optional vercel-tmp
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
    mkdirSync(DATA_DIR, { recursive: true });
    const dbPath = _dbMode === "vercel-tmp" ? path.join("/tmp", "ayeba.db") : LOCAL_DB_PATH;
    _db = new BetterSqlite3(dbPath) as unknown as AyebaDatabase;
    try {
      _db.pragma?.("journal_mode = WAL");
      _db.pragma?.("foreign_keys = ON");
    } catch {
      /* ignore */
    }
    migrate(_db);
    return _db;
  } catch (e) {
    console.error("[db] open failed, falling back to memory", _dbMode, e);
    _dbMode = "memory";
    _db = createMemoryDb();
    return _db;
  }
}

export function currentDbMode() {
  return _dbMode ?? getDbMode();
}

function migrate(db: AyebaDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL DEFAULT '',
      avatar_color TEXT NOT NULL DEFAULT '#e85d04',
      provider TEXT NOT NULL DEFAULT 'email',
      role TEXT NOT NULL DEFAULT 'contributor',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      safesearch INTEGER NOT NULL DEFAULT 1,
      region TEXT NOT NULL DEFAULT 'CD',
      language TEXT NOT NULL DEFAULT 'fr',
      theme TEXT NOT NULL DEFAULT 'dark',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crawl_documents (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      canonical_url TEXT,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      snippet TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      keywords TEXT NOT NULL DEFAULT '[]',
      source_type TEXT NOT NULL DEFAULT 'web',
      credibility REAL NOT NULL DEFAULT 0.5,
      local_relevant INTEGER NOT NULL DEFAULT 0,
      link_count INTEGER NOT NULL DEFAULT 0,
      crawled_at TEXT NOT NULL,
      recrawl_after TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_crawl_domain ON crawl_documents(domain);
    CREATE INDEX IF NOT EXISTS idx_crawl_recrawl ON crawl_documents(recrawl_after);

    CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
      doc_id UNINDEXED,
      url UNINDEXED,
      domain UNINDEXED,
      title,
      body,
      source_type UNINDEXED,
      credibility UNINDEXED,
      local_relevant UNINDEXED,
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TABLE IF NOT EXISTS crawl_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      priority INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      scheduled_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_queue_status ON crawl_queue(status, priority DESC);

    CREATE TABLE IF NOT EXISTS click_signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      clicked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ayebi_articles (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_json TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      protection TEXT NOT NULL DEFAULT 'none',
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_by_name TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS ayebi_fts USING fts5(
      slug UNINDEXED,
      title,
      summary,
      body,
      tags,
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TABLE IF NOT EXISTS ayebi_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      revision INTEGER NOT NULL,
      edit_summary TEXT NOT NULL,
      content_json TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(slug, revision)
    );

    CREATE TABLE IF NOT EXISTS ayebi_talk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_talk_slug ON ayebi_talk(slug);

    CREATE TABLE IF NOT EXISTS ayebi_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      parent_id TEXT,
      description TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS ayebi_uploads (
      id TEXT PRIMARY KEY,
      slug TEXT,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      license TEXT NOT NULL DEFAULT 'CC BY-SA 4.0',
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      reporter_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kg_entities (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      ayebi_slug TEXT,
      source_url TEXT
    );

    CREATE TABLE IF NOT EXISTS kg_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_kg_edges_from ON kg_edges(from_id);
    CREATE INDEX IF NOT EXISTS idx_kg_edges_to ON kg_edges(to_id);

    CREATE TABLE IF NOT EXISTS job_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_type TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      finished_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ml_rank_weights (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weights_json TEXT NOT NULL,
      samples INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_store(expires_at);

    CREATE TABLE IF NOT EXISTS vertical_images (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      thumb TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      domain TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      query_tags TEXT NOT NULL DEFAULT '',
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vertical_videos (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      thumb TEXT NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      duration_sec INTEGER,
      views INTEGER,
      query_tags TEXT NOT NULL DEFAULT '',
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products_index (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price REAL,
      currency TEXT NOT NULL DEFAULT 'CDF',
      store TEXT NOT NULL,
      url TEXT NOT NULL,
      thumb TEXT,
      rating REAL,
      category TEXT NOT NULL DEFAULT '',
      in_stock INTEGER NOT NULL DEFAULT 1,
      query_tags TEXT NOT NULL DEFAULT '',
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crawl_shards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shard_key TEXT NOT NULL UNIQUE,
      url_count INTEGER NOT NULL DEFAULT 0,
      last_flush TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_history_user ON search_history(user_id, created_at DESC);
  `);

  seedCategories(db);
  seedMlWeights(db);
}

function seedMlWeights(db: AyebaDatabase) {
  const row = db.prepare("SELECT id FROM ml_rank_weights WHERE id = 1").get();
  if (row) return;
  const defaultWeights = {
    fts: 0.35,
    titleMatch: 0.22,
    domainTrust: 0.15,
    localRdc: 0.12,
    clickBoost: 0.18,
    contentLen: 0.04,
    freshness: 0.06,
    queryCoverage: 0.14,
    spamPenalty: -0.25,
    ayebiBoost: 0.2,
    newsBoost: 0.08,
    academicBoost: 0.1,
    govBoost: 0.12,
    urlDepth: -0.03,
    hasImage: 0.02,
    linkCount: 0.05,
  };
  db.prepare(
    "INSERT INTO ml_rank_weights (id, weights_json, samples, updated_at) VALUES (1, ?, 0, ?)",
  ).run(JSON.stringify(defaultWeights), new Date().toISOString());
}

function seedCategories(db: AyebaDatabase) {
  const count = db.prepare("SELECT COUNT(*) as c FROM ayebi_categories").get() as { c: number } | undefined;
  if (count && count.c > 0) return;

  const cats = [
    { id: "rdc", label: "République démocratique du Congo", parent: null as string | null },
    { id: "personnalites", label: "Personnalités", parent: "rdc" },
    { id: "lieux", label: "Lieux & monuments", parent: "rdc" },
    { id: "institutions", label: "Institutions", parent: "rdc" },
    { id: "culture", label: "Culture & arts", parent: "rdc" },
    { id: "sport", label: "Sport", parent: "rdc" },
    { id: "economie", label: "Économie & mines", parent: "rdc" },
    { id: "politique", label: "Politique", parent: "rdc" },
    { id: "histoire", label: "Histoire", parent: "rdc" },
  ];
  const ins = db.prepare(
    "INSERT OR IGNORE INTO ayebi_categories (id, label, parent_id) VALUES (?, ?, ?)",
  );
  for (const c of cats) ins.run(c.id, c.label, c.parent);
}
