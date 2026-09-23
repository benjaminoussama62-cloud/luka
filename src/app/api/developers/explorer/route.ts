import { NextResponse } from "next/server";
import { getDb } from "@/lib/storage/database";
import { requireDeveloperSession } from "@/lib/developers/session";
import { listEnabledApis, projectAccess } from "@/lib/developers/console";
import { catalogEntry } from "@/lib/developers/catalog";
import { liveSearch } from "@/lib/real-search";
import { suggestQueries } from "@/lib/ayeba-index";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Explorateur d'API — exécute une vraie requête au nom du projet sélectionné.
 * L'appel est journalisé dans developer_api_logs (endpoint "explorer:<api>")
 * comme n'importe quel appel /api/v1, avec la clé active du projet si présente.
 * POST {projectId, apiId, params: {q, limit}}
 */
export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as
    | { projectId?: string; apiId?: string; params?: Record<string, string> }
    | null;
  if (!body?.projectId || !body.apiId) {
    return NextResponse.json({ error: "projectId et apiId requis" }, { status: 400 });
  }
  if (!projectAccess(body.projectId, auth.user.id)) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }
  const api = catalogEntry(body.apiId);
  if (!api) return NextResponse.json({ error: "API inconnue" }, { status: 404 });
  if (!listEnabledApis(body.projectId).includes(api.id)) {
    return NextResponse.json(
      { error: `Activez d'abord « ${api.name} » pour ce projet` },
      { status: 403 },
    );
  }

  const q = (body.params?.q || "").trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  const limit = Math.min(50, Math.max(1, Number(body.params?.limit) || 10));

  const db = getDb();
  const key = db
    .prepare(
      "SELECT id FROM developer_api_keys WHERE project_id = ? AND status = 'active' ORDER BY created_at LIMIT 1",
    )
    .get(body.projectId) as { id: string } | undefined;
  const started = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";

  const log = (status: number) => {
    db.prepare(
      "INSERT INTO developer_api_logs (key_id, project_id, endpoint, status_code, latency_ms, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).run(
      key?.id || "console",
      body.projectId,
      `explorer:${api.id}`,
      status,
      Date.now() - started,
      ip,
      new Date().toISOString(),
    );
  };

  try {
    if (api.id === "search") {
      const serp = await liveSearch(q, {
        skipUpstream: true,
        zeroAi: true,
        zeroAds: true,
        privateMode: true,
        sliders: { audience: 35, authority: 55, locality: 40 },
        timings: {},
      });
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: {
          query: q,
          total: serp.results.length,
          results: serp.results.slice(0, limit).map((r) => ({
            title: r.title,
            url: r.url,
            domain: r.domain,
            description: r.snippet,
          })),
          knowledge: serp.knowledge || null,
        },
      });
    }
    if (api.id === "suggest") {
      const suggestions = suggestQueries(q).slice(0, Math.min(10, limit));
      log(200);
      return NextResponse.json({
        status: 200,
        latencyMs: Date.now() - started,
        body: { query: q, suggestions },
      });
    }
    log(501);
    return NextResponse.json({ error: "API non exécutable" }, { status: 501 });
  } catch (e) {
    log(500);
    return NextResponse.json(
      { error: "Exécution échouée", message: e instanceof Error ? e.message : "error" },
      { status: 500 },
    );
  }
}
