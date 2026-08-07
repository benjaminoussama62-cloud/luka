import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

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

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDataDir();
  try {
    const raw = await readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(file: string, data: T) {
  await ensureDataDir();
  await writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

export async function getUsers(): Promise<DbUser[]> {
  const data = await readJson<UsersFile>("users.json", { users: [] });
  return data.users;
}

export async function saveUsers(users: DbUser[]) {
  await writeJson<UsersFile>("users.json", { users });
}

export async function findUserByEmail(email: string) {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string) {
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
  const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
  return data.byUser[userId] ?? [];
}

export async function pushSearchHistory(userId: string, query: string) {
  const data = await readJson<HistoryFile>("search-history.json", { byUser: {} });
  const prev = data.byUser[userId] ?? [];
  data.byUser[userId] = [query, ...prev.filter((q) => q !== query)].slice(0, 40);
  await writeJson("search-history.json", data);
}
