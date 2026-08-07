import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { getDb, getDbMode } from "./storage/database";

const DATA_DIR = path.join(process.cwd(), "data");

export type DbUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatarColor: string;
  provider: "email" | "google" | "github" | "microsoft" | "apple";
  createdAt: string;
};

export type CrawlDoc = {
  id: string;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  keywords: string[];
  crawledAt: string;
  localRelevant: boolean;
  sourceType: "web" | "gov" | "news" | "academic";
  credibility: number;
};

type UsersFile = { users: DbUser[] };
type CrawlFile = { docs: CrawlDoc[]; lastRun?: string };
type HistoryFile = { byUser: Record<string, string[]> };

function useSqliteStore() {
  // Prefer durable SQLite/Turso for auth + history on every environment.
  return true;
}

function rowToUser(row: {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_color: string;
  provider: string;
  created_at: string;
}): DbUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    avatarColor: row.avatar_color,
    provider: row.provider as DbUser["provider"],
    createdAt: row.created_at,
  };
}

function writableDataDir() {
  // Vercel serverless: /var/task is read-only — use /tmp.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", "ayeba-data");
  }
  return DATA_DIR;
}

async function ensureDataDir() {
  await mkdir(writableDataDir(), { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const raw = await readFile(path.join(writableDataDir(), file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  try {
    await ensureDataDir();
    await writeFile(path.join(writableDataDir(), file), JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("[db] writeJson skipped", file, e);
  }
}

export async function getUsers(): Promise<DbUser[]> {
  if (useSqliteStore()) {
    const rows = getDb()
      .prepare(
        "SELECT id, name, email, password_hash, avatar_color, provider, created_at FROM users ORDER BY created_at",
      )
      .all() as Array<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      avatar_color: string;
      provider: string;
      created_at: string;
    }>;
    if (rows.length > 0) return rows.map(rowToUser);

    // One-time hydrate from legacy JSON (local only).
    if (getDbMode() === "local") {
      const data = await readJson<UsersFile>("users.json", { users: [] });
      if (data.users.length) {
        await saveUsers(data.users);
        return data.users;
      }
    }
    return [];
  }

  const data = await readJson<UsersFile>("users.json", { users: [] });
  return data.users;
}

export async function saveUsers(users: DbUser[]) {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO users (id, name, email, password_hash, avatar_color, provider, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'contributor', ?)
     ON CONFLICT(id) DO UPDATE SET
       name=excluded.name,
       email=excluded.email,
       password_hash=excluded.password_hash,
       avatar_color=excluded.avatar_color,
       provider=excluded.provider`,
  );

  for (const u of users) {
    upsert.run(
      u.id,
      u.name,
      u.email,
      u.passwordHash,
      u.avatarColor,
      u.provider,
      u.createdAt,
    );
  }

  // Mirror to JSON locally for backups / scripts.
  if (getDbMode() === "local") {
    await writeJson<UsersFile>("users.json", { users });
  }
}

export async function findUserByEmail(email: string) {
  if (useSqliteStore()) {
    const row = getDb()
      .prepare(
        "SELECT id, name, email, password_hash, avatar_color, provider, created_at FROM users WHERE lower(email) = lower(?)",
      )
      .get(email) as
      | {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          avatar_color: string;
          provider: string;
          created_at: string;
        }
      | undefined;
    if (row) return rowToUser(row);
  }
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
  if (useSqliteStore()) {
    const row = getDb()
      .prepare(
        "SELECT id, name, email, password_hash, avatar_color, provider, created_at FROM users WHERE id = ?",
      )
      .get(id) as
      | {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          avatar_color: string;
          provider: string;
          created_at: string;
        }
      | undefined;
    if (row) return rowToUser(row);
  }
  const users = await getUsers();
  return users.find((u) => u.id === id) ?? null;
}

export async function getCrawlIndex(): Promise<CrawlDoc[]> {
  const data = await readJson<CrawlFile>("crawl-index.json", { docs: [] });
  return data.docs;
}

export async function saveCrawlIndex(docs: CrawlDoc[], lastRun?: string) {
  await writeJson<CrawlFile>("crawl-index.json", { docs, lastRun });
}

export async function getSearchHistory(userId: string): Promise<string[]> {
  if (useSqliteStore()) {
    const rows = getDb()
      .prepare(
        "SELECT query FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 40",
      )
      .all(userId) as Array<{ query: string }>;
    if (rows.length) return rows.map((r) => r.query);

    if (getDbMode() === "local") {
      const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
      return data.byUser[userId] ?? [];
    }
    return [];
  }

  const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
  return data.byUser[userId] ?? [];
}

export async function pushSearchHistory(userId: string, query: string) {
  if (useSqliteStore()) {
    const db = getDb();
    db.prepare("DELETE FROM search_history WHERE user_id = ? AND query = ?").run(userId, query);
    db.prepare(
      "INSERT INTO search_history (user_id, query, created_at) VALUES (?, ?, ?)",
    ).run(userId, query, new Date().toISOString());

    // Keep last 40
    db.prepare(
      `DELETE FROM search_history WHERE user_id = ? AND id NOT IN (
         SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 40
       )`,
    ).run(userId, userId);

    if (getDbMode() === "local") {
      const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
      const prev = data.byUser[userId] ?? [];
      data.byUser[userId] = [query, ...prev.filter((q) => q !== query)].slice(0, 40);
      await writeJson("search-history.json", data);
    }
    return;
  }

  const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
  const prev = data.byUser[userId] ?? [];
  data.byUser[userId] = [query, ...prev.filter((q) => q !== query)].slice(0, 40);
  await writeJson("search-history.json", data);
}
