import { getDb } from "./storage/database";

export type UserPreferences = {
  safesearch: boolean;
  region: string;
  language: string;
  theme: string;
};

const DEFAULTS: UserPreferences = {
  safesearch: true,
  region: "CD",
  language: "fr",
  theme: "dark",
};

export function getPreferences(userId: string): UserPreferences {
  const row = getDb()
    .prepare("SELECT safesearch, region, language, theme FROM user_preferences WHERE user_id = ?")
    .get(userId) as Record<string, unknown> | undefined;

  if (!row) return DEFAULTS;
  return {
    safesearch: Boolean(row.safesearch),
    region: String(row.region),
    language: String(row.language),
    theme: String(row.theme),
  };
}

export function savePreferences(userId: string, prefs: Partial<UserPreferences>) {
  const current = getPreferences(userId);
  const merged = { ...current, ...prefs };
  getDb()
    .prepare(
      `INSERT INTO user_preferences (user_id, safesearch, region, language, theme, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET safesearch=excluded.safesearch, region=excluded.region, language=excluded.language, theme=excluded.theme, updated_at=excluded.updated_at`,
    )
    .run(
      userId,
      merged.safesearch ? 1 : 0,
      merged.region,
      merged.language,
      merged.theme,
      new Date().toISOString(),
    );
  return merged;
}

export function syncUserRole(userId: string, role = "contributor") {
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}
