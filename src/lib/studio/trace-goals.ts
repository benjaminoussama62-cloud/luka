import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/storage/database";

export type ConversionGoal = {
  id: string;
  site_id: string;
  name: string;
  event_type: string;
  value: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type GoalWithStats = ConversionGoal & {
  fires: number;
  total_value: number;
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

/** List goals for a site, with fire counts from trace_events_enhanced. */
export function listConversionGoals(siteId: string, days = 28): GoalWithStats[] {
  const db = getDb();
  const since = daysAgo(days);
  const goals = db
    .prepare(
      `SELECT * FROM trace_conversion_goals
       WHERE site_id = ? ORDER BY created_at DESC`,
    )
    .all(siteId) as ConversionGoal[];

  return goals.map((g) => {
    const stats = db
      .prepare(
        `SELECT COUNT(*) as fires,
                SUM(CASE
                  WHEN json_extract(custom_events, '$.value') IS NOT NULL
                    THEN CAST(json_extract(custom_events, '$.value') AS REAL)
                  ELSE ?
                END) as total_value
         FROM trace_events_enhanced
         WHERE site_id = ? AND timestamp >= ? AND event_type = ?`,
      )
      .get(g.value, siteId, since, g.event_type) as {
      fires: number;
      total_value: number | null;
    };
    return {
      ...g,
      fires: Number(stats?.fires) || 0,
      total_value: Number(stats?.total_value) || 0,
    };
  });
}

export function createConversionGoal(input: {
  siteId: string;
  name: string;
  eventType: string;
  value?: number;
}): ConversionGoal {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const name = input.name.trim().slice(0, 120);
  const eventType = input.eventType.trim().slice(0, 64);
  const value = Math.max(0, Number(input.value) || 0);
  if (!name || !eventType) throw Object.assign(new Error("name et event_type requis"), { status: 400 });

  db.prepare(
    `INSERT INTO trace_conversion_goals
       (id, site_id, name, event_type, value, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
  ).run(id, input.siteId, name, eventType, value, now, now);

  return db.prepare("SELECT * FROM trace_conversion_goals WHERE id = ?").get(id) as ConversionGoal;
}

export function updateConversionGoal(
  siteId: string,
  id: string,
  patch: { name?: string; eventType?: string; value?: number; status?: string },
): ConversionGoal {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM trace_conversion_goals WHERE id = ? AND site_id = ?")
    .get(id, siteId);
  if (!existing) throw Object.assign(new Error("Objectif introuvable"), { status: 404 });

  const sets: string[] = [];
  const vals: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    vals.push(patch.name.trim().slice(0, 120));
  }
  if (patch.eventType !== undefined) {
    sets.push("event_type = ?");
    vals.push(patch.eventType.trim().slice(0, 64));
  }
  if (patch.value !== undefined) {
    sets.push("value = ?");
    vals.push(Math.max(0, Number(patch.value) || 0));
  }
  if (patch.status !== undefined) {
    if (!["active", "paused"].includes(patch.status)) {
      throw Object.assign(new Error("statut invalide"), { status: 400 });
    }
    sets.push("status = ?");
    vals.push(patch.status);
  }
  if (!sets.length) throw Object.assign(new Error("rien à modifier"), { status: 400 });

  const now = new Date().toISOString();
  sets.push("updated_at = ?");
  vals.push(now, id);
  db.prepare(`UPDATE trace_conversion_goals SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return db.prepare("SELECT * FROM trace_conversion_goals WHERE id = ?").get(id) as ConversionGoal;
}

export function deleteConversionGoal(siteId: string, id: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM trace_conversion_goals WHERE id = ? AND site_id = ?")
    .get(id, siteId);
  if (!existing) throw Object.assign(new Error("Objectif introuvable"), { status: 404 });
  db.prepare("DELETE FROM trace_conversion_goals WHERE id = ?").run(id);
}

/** Active goals whose event_type matches the incoming event. */
export function matchingGoals(
  siteId: string,
  eventType: string,
): Array<{ id: string; name: string; value: number }> {
  return getDb()
    .prepare(
      `SELECT id, name, value FROM trace_conversion_goals
       WHERE site_id = ? AND status = 'active' AND event_type = ?`,
    )
    .all(siteId, eventType) as Array<{ id: string; name: string; value: number }>;
}

/**
 * Mark the latest attribution touchpoint for this session as a conversion,
 * using the goal (or event) value.
 */
export function markAttributionConversion(input: {
  sessionId: string;
  siteId: string;
  value: number;
}) {
  const db = getDb();
  const sid = String(input.sessionId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  if (!sid) return;
  const row = db
    .prepare(
      `SELECT id FROM attribution_touchpoints
       WHERE session_id = ? AND site_id = ?
       ORDER BY position DESC LIMIT 1`,
    )
    .get(sid, input.siteId) as { id: number } | undefined;
  if (!row) return;
  db.prepare(
    `UPDATE attribution_touchpoints
     SET is_conversion = 1, conversion_value = ?
     WHERE id = ?`,
  ).run(Math.max(0, input.value), row.id);
}
