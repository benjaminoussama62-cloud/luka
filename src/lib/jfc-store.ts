import { getDb } from "./storage/database";

export type JfcRankedRow = {
  user_id: string;
  mmr: number;
  wins: number;
  losses: number;
  streak: number;
  division: string;
  updated_at: string;
};

export type JfcLiveConfig = {
  seasonId: string;
  seasonName: string;
  dataVersion: string;
  rankedOpen: boolean;
  maintenance: boolean;
};

const LIVE_DEFAULT: JfcLiveConfig = {
  seasonId: "2026-s1",
  seasonName: "Saison Alpha Linafoot 2026",
  dataVersion: "clubs-v3",
  rankedOpen: true,
  maintenance: false,
};

export function jfcLiveConfig(): JfcLiveConfig {
  const db = getDb();
  const row = db
    .prepare("SELECT config_json FROM jfc_live_config WHERE id = 1")
    .get() as { config_json?: string } | undefined;
  if (!row?.config_json) return LIVE_DEFAULT;
  try {
    return { ...LIVE_DEFAULT, ...JSON.parse(row.config_json) };
  } catch {
    return LIVE_DEFAULT;
  }
}

export function jfcGetCloudSave(userId: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT save_json, revision, updated_at FROM jfc_cloud_saves WHERE user_id = ?",
    )
    .get(userId) as
    | { save_json: string; revision: number; updated_at: string }
    | undefined;
}

export function jfcPutCloudSave(userId: string, saveJson: string, clientRevision: number) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = jfcGetCloudSave(userId);
  if (existing && clientRevision > 0 && clientRevision < existing.revision) {
    return { ok: false as const, conflict: true, server: existing };
  }
  const revision = (existing?.revision ?? 0) + 1;
  db.prepare(
    `INSERT INTO jfc_cloud_saves (user_id, save_json, revision, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET save_json = excluded.save_json,
       revision = excluded.revision, updated_at = excluded.updated_at`,
  ).run(userId, saveJson, revision, now);
  return { ok: true as const, revision, updated_at: now };
}

export function jfcGetRanked(userId: string): JfcRankedRow {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT user_id, mmr, wins, losses, streak, division, updated_at FROM jfc_ranked WHERE user_id = ?",
    )
    .get(userId) as JfcRankedRow | undefined;
  if (row) return row;
  const now = new Date().toISOString();
  const fresh: JfcRankedRow = {
    user_id: userId,
    mmr: 1000,
    wins: 0,
    losses: 0,
    streak: 0,
    division: divisionFromMmr(1000),
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO jfc_ranked (user_id, mmr, wins, losses, streak, division, updated_at)
     VALUES (?, ?, 0, 0, 0, ?, ?)`,
  ).run(userId, fresh.mmr, fresh.division, now);
  return fresh;
}

export function divisionFromMmr(mmr: number) {
  if (mmr >= 1800) return "Élite CAF";
  if (mmr >= 1500) return "Division 1";
  if (mmr >= 1200) return "Division 2";
  if (mmr >= 1000) return "Amateur Pro";
  return "Découverte";
}

export function jfcApplyRankedResult(userId: string, won: boolean, foeMmr: number, matchId: string) {
  const db = getDb();
  const dup = db
    .prepare("SELECT id FROM jfc_ranked_matches WHERE match_id = ?")
    .get(matchId) as { id?: number } | undefined;
  if (dup?.id) return { ok: false as const, error: "Match déjà enregistré." };

  const r = jfcGetRanked(userId);
  const expected = 1 / (1 + Math.pow(10, (foeMmr - r.mmr) / 400));
  const score = won ? 1 : 0;
  const k = r.mmr < 1100 ? 40 : r.mmr > 1700 ? 24 : 32;
  const newMmr = Math.round(Math.max(100, Math.min(3000, r.mmr + k * (score - expected))));
  const wins = r.wins + (won ? 1 : 0);
  const losses = r.losses + (won ? 0 : 1);
  const streak = won ? Math.max(0, r.streak) + 1 : Math.min(0, r.streak) - 1;
  const division = divisionFromMmr(newMmr);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE jfc_ranked SET mmr = ?, wins = ?, losses = ?, streak = ?, division = ?, updated_at = ?
     WHERE user_id = ?`,
  ).run(newMmr, wins, losses, streak, division, now, userId);

  db.prepare(
    `INSERT INTO jfc_ranked_matches (match_id, user_id, won, foe_mmr, mmr_delta, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(matchId, userId, won ? 1 : 0, foeMmr, newMmr - r.mmr, now);

  return {
    ok: true as const,
    mmr: newMmr,
    wins,
    losses,
    streak,
    division,
  };
}
