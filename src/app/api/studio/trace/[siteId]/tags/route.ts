import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireStudioSite, studioError } from "@/lib/studio/http";
import { ensureSiteModules } from "@/lib/studio/modules";
import { getDb } from "@/lib/storage/database";

type Ctx = { params: Promise<{ siteId: string }> };

const TAG_TYPES = ["pageview", "event", "scroll", "click", "conversion", "custom"] as const;
const TRIGGERS = ["all_pages", "path_contains", "event_name", "scroll_depth", "click_element"] as const;

/** GET /api/studio/trace/[siteId]/tags — list tag-manager rules + snippet. */
export async function GET(_req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const rules = getDb()
      .prepare("SELECT * FROM trace_tag_rules WHERE site_id = ? ORDER BY created_at DESC")
      .all(owned.site.id);
    const mods = ensureSiteModules(owned.site.id);
    return NextResponse.json({ site: owned.site, rules, traceKey: mods.traceKey });
  } catch (e) {
    return studioError(e);
  }
}

/**
 * POST /api/studio/trace/[siteId]/tags
 * { action: "create", name, tagType, triggerType, triggerValue?, config? }
 * { action: "update", id, name?, status?, triggerType?, triggerValue?, config? }
 * { action: "delete", id }
 */
export async function POST(req: Request, ctx: Ctx) {
  const { siteId } = await ctx.params;
  const owned = await requireStudioSite(siteId);
  if (owned instanceof NextResponse) return owned;
  try {
    const body = (await req.json()) as {
      action?: string;
      id?: string;
      name?: string;
      tagType?: string;
      triggerType?: string;
      triggerValue?: string;
      config?: Record<string, unknown>;
      status?: string;
    };
    const db = getDb();
    const now = new Date().toISOString();

    if (body.action === "create") {
      if (!body.name?.trim() || !TAG_TYPES.includes(body.tagType as never) || !TRIGGERS.includes(body.triggerType as never)) {
        return NextResponse.json({ error: "name, tagType et triggerType valides requis" }, { status: 400 });
      }
      const id = randomUUID();
      db.prepare(
        `INSERT INTO trace_tag_rules (id, site_id, name, tag_type, trigger_type, trigger_value, config, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      ).run(
        id, owned.site.id, body.name.trim(), body.tagType, body.triggerType,
        (body.triggerValue || "").slice(0, 300), JSON.stringify(body.config || {}), now, now,
      );
      const rule = db.prepare("SELECT * FROM trace_tag_rules WHERE id = ?").get(id);
      return NextResponse.json({ ok: true, rule });
    }

    if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 });
    const existing = db
      .prepare("SELECT id FROM trace_tag_rules WHERE id = ? AND site_id = ?")
      .get(body.id, owned.site.id);
    if (!existing) return NextResponse.json({ error: "Règle introuvable" }, { status: 404 });

    if (body.action === "delete") {
      db.prepare("DELETE FROM trace_tag_rules WHERE id = ?").run(body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "update") {
      if (body.status && !["active", "paused"].includes(body.status)) {
        return NextResponse.json({ error: "statut invalide" }, { status: 400 });
      }
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (body.name !== undefined) { sets.push("name = ?"); vals.push(body.name.trim()); }
      if (body.status !== undefined) { sets.push("status = ?"); vals.push(body.status); }
      if (body.triggerType !== undefined) {
        if (!TRIGGERS.includes(body.triggerType as never)) {
          return NextResponse.json({ error: "triggerType invalide" }, { status: 400 });
        }
        sets.push("trigger_type = ?"); vals.push(body.triggerType);
      }
      if (body.triggerValue !== undefined) { sets.push("trigger_value = ?"); vals.push(body.triggerValue.slice(0, 300)); }
      if (body.config !== undefined) { sets.push("config = ?"); vals.push(JSON.stringify(body.config)); }
      if (!sets.length) return NextResponse.json({ error: "rien à modifier" }, { status: 400 });
      sets.push("updated_at = ?"); vals.push(now, body.id);
      db.prepare(`UPDATE trace_tag_rules SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      const rule = db.prepare("SELECT * FROM trace_tag_rules WHERE id = ?").get(body.id);
      return NextResponse.json({ ok: true, rule });
    }

    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (e) {
    return studioError(e);
  }
}
