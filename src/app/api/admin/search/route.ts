import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

/**
 * GET /api/admin/search — moteur de recherche : index, crawl, requêtes,
 * santé des upstreams. ?view=queue pour la file paginée (?status=&limit=).
 */
export async function GET(req: Request) {
  const auth = await requireSection("search");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const db = adb();
  const count = async (sql: string, ...args: unknown[]) =>
    Number(((await db.get(sql, [args])) as { n?: number } | undefined)?.n ?? 0);
  const all = (sql: string, ...args: unknown[]) => db.all(sql, args);

  // File de crawl paginée (million-scale : jamais de dump complet).
  if (url.searchParams.get("view") === "queue") {
    const status = url.searchParams.get("status") || "pending";
    const limit = Math.min(300, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    const rows = await all("SELECT url, status, priority, attempts, last_error, created_at FROM crawl_queue WHERE status = ? ORDER BY priority DESC, created_at ASC LIMIT ?",
      status, limit
    );
    return NextResponse.json({ ok: true, queue: rows });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const oneDayAgo = new Date(Date.now() - 86400_000).toISOString();

  // Santé upstreams 24 h — probes, taux de succès, latence, dernier échec.
  let upstream: Record<string, unknown>[] = [];
  try {
    upstream = (await all(`SELECT source,
              COUNT(*) AS probes,
              SUM(ok) AS ok,
              AVG(ms) AS avg_ms,
              SUM(hits) AS hits,
              MAX(created_at) AS last_probe,
              SUM(CASE WHEN ok = 1 AND hits = 0 THEN 1 ELSE 0 END) AS empty_200
       FROM upstream_health WHERE created_at >= ? GROUP BY source`,
      oneDayAgo
    )) as Record<string, unknown>[];
    for (const u of upstream) {
      const lastErr = (await db.get("SELECT error, created_at FROM upstream_health WHERE source = ? AND ok = 0 ORDER BY id DESC LIMIT 1", [u.source])) as { error?: string; created_at?: string } | undefined;
      u.last_error = lastErr?.error ?? "";
      u.ok_rate = Number(u.probes) > 0 ? Math.round((Number(u.ok) / Number(u.probes)) * 100) : 0;
      u.avg_ms = Math.round(Number(u.avg_ms ?? 0));
    }
  } catch {
    /* table pas encore créée */
  }

  return NextResponse.json({
    ok: true,
    index: {
      totalDocuments: await count("SELECT COUNT(*) AS n FROM crawl_documents"),
      localDocuments: await count("SELECT COUNT(*) AS n FROM crawl_documents WHERE local_relevant = 1"),
      lastCrawled:
        ((await db.get("SELECT MAX(crawled_at) AS m FROM crawl_documents")) as { m: string | null } | undefined)?.m ?? null,
      bySourceType: await all("SELECT source_type, COUNT(*) AS n FROM crawl_documents GROUP BY source_type ORDER BY n DESC"
      ),
      topDomains: await all("SELECT domain, COUNT(*) AS pages, AVG(credibility) AS avg_credibility FROM crawl_documents GROUP BY domain ORDER BY pages DESC LIMIT 20"
      ),
    },
    queue: {
      pending: await count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'pending'"),
      processing: await count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'processing'"),
      failed: await count("SELECT COUNT(*) AS n FROM crawl_queue WHERE status = 'failed' OR attempts > 3"),
      recentErrors: await all("SELECT url, last_error, attempts, created_at FROM crawl_queue WHERE last_error IS NOT NULL ORDER BY created_at DESC LIMIT 20"
      ),
    },
    upstream,
    queries: {
      top7d: await all("SELECT query, COUNT(*) AS n FROM search_history WHERE created_at >= ? GROUP BY lower(query) ORDER BY n DESC LIMIT 25",
        sevenDaysAgo
      ),
      recent: await all("SELECT h.query, h.created_at, u.email AS user_email FROM search_history h LEFT JOIN users u ON u.id = h.user_id ORDER BY h.created_at DESC LIMIT 30"
      ),
      totalSearches: await count("SELECT COUNT(*) AS n FROM search_history"),
      impressions7d: await count("SELECT COUNT(*) AS n FROM impression_signals WHERE shown_at >= ?", sevenDaysAgo),
      clicks7d: await count("SELECT COUNT(*) AS n FROM click_signals WHERE clicked_at >= ?", sevenDaysAgo),
    },
    articles: {
      total: await count("SELECT COUNT(*) AS n FROM ayebi_articles"),
      stubs: await count("SELECT COUNT(*) AS n FROM ayebi_articles WHERE stub = 1"),
      views: await count("SELECT COALESCE(SUM(view_count),0) AS n FROM ayebi_articles"),
      flagged: await count("SELECT COUNT(*) AS n FROM ayebi_flags WHERE status = 'pending'"),
    },
  });
}

/**
 * POST /api/admin/search — actions crawler (auditées).
 * {action:"retry_failed"}           — remet les URLs échouées en pending
 * {action:"purge_domain", domain}   — sort un domaine de l'index + de la file
 */
export async function POST(req: Request) {
  const auth = await requireSection("search");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as
    | { action?: string; domain?: string }
    | null;
  const db = adb();

  const audit = async (action: string, entityId: string, changes: Record<string, unknown>) => {
    try {
      await db.run(`INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
         VALUES (?, ?, ?, ?, 'crawl', ?, ?, ?)`, [crypto.randomUUID(), auth.admin?.id ?? "env", auth.admin?.name ?? auth.user.name,
         action, entityId, JSON.stringify(changes), new Date().toISOString()]);
    } catch { /* best-effort */ }
  };

  if (body?.action === "retry_failed") {
    const r = await db.run("UPDATE crawl_queue SET status = 'pending', attempts = 0, last_error = NULL, scheduled_at = ? WHERE status = 'failed' OR attempts > 3", [new Date().toISOString()]);
    const n = Number((r as { changes?: number }).changes ?? 0);
    await audit("crawl_retry_failed", "*", { reset: n });
    return NextResponse.json({ ok: true, reset: n });
  }

  if (body?.action === "purge_domain") {
    const domain = String(body.domain || "").trim().toLowerCase();
    if (!domain || domain.length < 4 || domain.includes("/") || domain.includes(" ")) {
      return NextResponse.json({ error: "domain invalide (ex: example.com)" }, { status: 400 });
    }
    const docs = await db.run("DELETE FROM crawl_documents WHERE domain = ?", [domain]);
    const queued = await db.run("DELETE FROM crawl_queue WHERE url LIKE ?", [`%://${domain}%`]);
    await audit("crawl_purge_domain", domain, {
      documents: Number((docs as { changes?: number }).changes ?? 0),
      queue: Number((queued as { changes?: number }).changes ?? 0),
    });
    return NextResponse.json({
      ok: true, domain,
      documents: Number((docs as { changes?: number }).changes ?? 0),
      queue: Number((queued as { changes?: number }).changes ?? 0),
    });
  }

  return NextResponse.json({ error: "action ∈ retry_failed | purge_domain" }, { status: 400 });
}
