/**
 * Real Lighthouse audits via the Google PageSpeed Insights API.
 * Returns genuine lab + field metrics — no simulated data.
 * Optional PAGESPEED_API_KEY raises the free quota.
 */
import { getDb } from "@/lib/storage/database";
import type { StudioSite } from "./types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PsiFieldMetric = {
  percentile: number | null;
  category: "FAST" | "AVERAGE" | "SLOW" | null;
};

export type PsiFieldData = {
  overallCategory: "FAST" | "AVERAGE" | "SLOW" | null;
  lcp: PsiFieldMetric | null;
  cls: PsiFieldMetric | null;
  inp: PsiFieldMetric | null;
  fcp: PsiFieldMetric | null;
  ttfb: PsiFieldMetric | null;
} | null;

export type PsiAuditResult = {
  id: string;
  url: string;
  strategy: "mobile" | "desktop";
  timestamp: string;
  source: "pagespeed_insights" | "direct_fetch";
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
    overall: number;
  };
  metrics: {
    firstContentfulPaintMs: number | null;
    largestContentfulPaintMs: number | null;
    totalBlockingTimeMs: number | null;
    cumulativeLayoutShift: number | null;
    speedIndexMs: number | null;
    timeToInteractiveMs: number | null;
    serverResponseTimeMs: number | null;
    totalByteWeightBytes: number | null;
  };
  /** CrUX — données terrain (utilisateurs Chrome réels), distinctes du lab Lighthouse. */
  fieldData: PsiFieldData;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savingsMs: number | null;
    savingsBytes: number | null;
  }>;
  diagnostics: Array<{ id: string; title: string; displayValue: string | null }>;
};

function numericMetric(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? Math.round(n) : null;
}

function categoryScore(lhr: Record<string, unknown>, id: string): number | null {
  const cats = lhr.categories as Record<string, { score?: number }> | undefined;
  const s = cats?.[id]?.score;
  return typeof s === "number" ? Math.round(s * 100) : null;
}

export async function runPsiAudit(
  site: StudioSite,
  rawUrl: string | undefined,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PsiAuditResult> {
  const url = rawUrl?.trim()
    ? rawUrl.includes("://")
      ? rawUrl
      : `https://${rawUrl}`
    : `https://${site.domain}/`;

  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("URL hors de ce domaine"), { status: 400 });
  }

  const params = new URLSearchParams({
    url,
    strategy,
    category: ["performance", "accessibility", "best-practices", "seo"].join(","),
  });
  const apiKey = process.env.PAGESPEED_API_KEY?.trim();
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(
      new Error(`PageSpeed Insights a répondu ${res.status}${res.status === 429 ? " — quota atteint, réessayez plus tard" : ""}`),
      { status: res.status === 429 ? 429 : 502, detail: detail.slice(0, 300) },
    );
  }

  const data = (await res.json()) as {
    lighthouseResult?: {
      categories?: Record<string, { score?: number }>;
      audits?: Record<
        string,
        {
          title?: string;
          description?: string;
          numericValue?: number;
          displayValue?: string;
          details?: { type?: string; overallSavingsMs?: number; overallSavingsBytes?: number };
        }
      >;
      finalDisplayedUrl?: string;
      fetchTime?: string;
    };
    loadingExperience?: {
      overall_category?: string;
      metrics?: Record<
        string,
        { percentile?: number; category?: string }
      >;
    };
    originLoadingExperience?: {
      overall_category?: string;
      metrics?: Record<
        string,
        { percentile?: number; category?: string }
      >;
    };
  };
  const lhr = data.lighthouseResult;
  if (!lhr?.audits) {
    throw Object.assign(new Error("Réponse PageSpeed Insights incomplète"), { status: 502 });
  }

  const audit = (id: string) => lhr.audits?.[id];
  const metric = (id: string) => numericMetric(audit(id)?.numericValue);

  const perf = categoryScore(lhr as unknown as Record<string, unknown>, "performance");
  const a11y = categoryScore(lhr as unknown as Record<string, unknown>, "accessibility");
  const bp = categoryScore(lhr as unknown as Record<string, unknown>, "best-practices");
  const seo = categoryScore(lhr as unknown as Record<string, unknown>, "seo");
  const scored = [perf, a11y, bp, seo].filter((s): s is number => s != null);
  const overall = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;

  const opportunities = Object.entries(lhr.audits)
    .filter(([, a]) => a?.details?.type === "opportunity" && (a.details.overallSavingsMs ?? 0) > 0)
    .map(([id, a]) => ({
      id,
      title: a.title || id,
      description: (a.description || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").slice(0, 300),
      savingsMs: a.details?.overallSavingsMs != null ? Math.round(a.details.overallSavingsMs) : null,
      savingsBytes: a.details?.overallSavingsBytes ?? null,
    }))
    .sort((a, b) => (b.savingsMs ?? 0) - (a.savingsMs ?? 0))
    .slice(0, 12);

  const diagnostics = ["uses-text-compression", "uses-responsive-images", "render-blocking-resources", "unminified-javascript", "unminified-css", "uses-optimized-images", "modern-image-formats", "uses-long-cache-ttl", "total-byte-weight", "dom-size", "third-party-summary", "mainthread-work-breakdown", "bootup-time", "font-display", "lcp-lazy-loaded", "prioritize-lcp-image"]
    .map((id) => {
      const a = audit(id);
      if (!a) return null;
      return { id, title: a.title || id, displayValue: a.displayValue ?? null };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const fieldData = parseCruxFieldData(
    data.loadingExperience ?? data.originLoadingExperience,
  );

  const result: PsiAuditResult = {
    id: `psi_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    url: lhr.finalDisplayedUrl || url,
    strategy,
    timestamp: lhr.fetchTime || new Date().toISOString(),
    source: "pagespeed_insights",
    scores: { performance: perf, accessibility: a11y, bestPractices: bp, seo, overall },
    metrics: {
      firstContentfulPaintMs: metric("first-contentful-paint"),
      largestContentfulPaintMs: metric("largest-contentful-paint"),
      totalBlockingTimeMs: metric("total-blocking-time"),
      cumulativeLayoutShift:
        typeof audit("cumulative-layout-shift")?.numericValue === "number"
          ? Math.round(audit("cumulative-layout-shift")!.numericValue! * 1000) / 1000
          : null,
      speedIndexMs: metric("speed-index"),
      timeToInteractiveMs: metric("interactive"),
      serverResponseTimeMs: metric("server-response-time"),
      totalByteWeightBytes: metric("total-byte-weight"),
    },
    fieldData,
    opportunities,
    diagnostics,
  };

  getDb()
    .prepare(
      `INSERT INTO velocity_metrics_detailed (
        id, site_id, url, timestamp, form_factor, overall_score, performance_score,
        accessibility_score, best_practices_score, seo_score, scores, metrics,
        audits, opportunities, diagnostics, passed_audits, failed_audits, warnings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)`,
    )
    .run(
      result.id,
      site.id,
      result.url,
      result.timestamp,
      strategy,
      result.scores.overall,
      result.scores.performance,
      result.scores.accessibility,
      result.scores.bestPractices,
      result.scores.seo,
      JSON.stringify(result.scores),
      JSON.stringify({ ...result.metrics, fieldData: result.fieldData }),
      JSON.stringify({ fieldData: result.fieldData }),
      JSON.stringify(result.opportunities),
      JSON.stringify(result.diagnostics),
      result.opportunities.length,
    );

  return result;
}

function parseCruxCategory(raw?: string): "FAST" | "AVERAGE" | "SLOW" | null {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u === "FAST" || u === "AVERAGE" || u === "SLOW") return u;
  return null;
}

function parseCruxFieldData(
  exp:
    | {
        overall_category?: string;
        metrics?: Record<string, { percentile?: number; category?: string }>;
      }
    | undefined,
): PsiFieldData {
  if (!exp?.metrics) return null;
  const m = exp.metrics;
  const one = (key: string): PsiFieldMetric | null => {
    const row = m[key];
    if (!row) return null;
    return {
      percentile: typeof row.percentile === "number" ? row.percentile : null,
      category: parseCruxCategory(row.category),
    };
  };
  return {
    overallCategory: parseCruxCategory(exp.overall_category),
    lcp: one("LARGEST_CONTENTFUL_PAINT_MS"),
    cls: one("CUMULATIVE_LAYOUT_SHIFT_SCORE"),
    inp: one("INTERACTION_TO_NEXT_PAINT") ?? one("FIRST_INPUT_DELAY_MS"),
    fcp: one("FIRST_CONTENTFUL_PAINT_MS"),
    ttfb: one("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
  };
}

export function psiAuditHistory(siteId: string, limit = 20) {
  const rows = getDb()
    .prepare(
      `SELECT id, url, timestamp, form_factor, overall_score, performance_score,
              accessibility_score, best_practices_score, seo_score, metrics, opportunities
       FROM velocity_metrics_detailed
       WHERE site_id = ? ORDER BY timestamp DESC LIMIT ?`,
    )
    .all(siteId, limit) as Array<{
    id: string;
    url: string;
    timestamp: string;
    form_factor: string | null;
    overall_score: number;
    performance_score: number | null;
    accessibility_score: number | null;
    best_practices_score: number | null;
    seo_score: number | null;
    metrics: string;
    opportunities: string;
  }>;

  return rows.map((r) => {
    const metrics = safeParse(r.metrics) as Record<string, unknown> | null;
    const fieldData =
      metrics && typeof metrics === "object" && "fieldData" in metrics
        ? (metrics.fieldData as PsiFieldData)
        : null;
    return {
      id: r.id,
      url: r.url,
      timestamp: r.timestamp,
      strategy: r.form_factor || "mobile",
      scores: {
        overall: r.overall_score,
        performance: r.performance_score,
        accessibility: r.accessibility_score,
        bestPractices: r.best_practices_score,
        seo: r.seo_score,
      },
      metrics,
      fieldData,
      opportunities: safeParse(r.opportunities),
    };
  });
}

/** Top crawled URLs for a site domain (real index, no mocks). */
export function crawledUrlsForSite(domain: string, limit = 5): string[] {
  const rows = getDb()
    .prepare(
      `SELECT url FROM crawl_documents
       WHERE domain = ? OR domain LIKE ?
       ORDER BY crawled_at DESC LIMIT ?`,
    )
    .all(domain, `%.${domain}`, Math.max(1, Math.min(limit, 5))) as Array<{ url: string }>;
  return rows.map((r) => r.url).filter(Boolean);
}

export type PsiBatchResult = {
  audited: PsiAuditResult[];
  skipped: string[];
  quotaHit: boolean;
  errors: Array<{ url: string; error: string }>;
  requested: number;
};

/**
 * Sequential PageSpeed audits for top N crawled URLs (max 5).
 * Stops immediately on HTTP 429 to respect the PAGESPEED quota.
 */
export async function runPsiBatchAudit(
  site: StudioSite,
  opts: { limit?: number; strategy?: "mobile" | "desktop" } = {},
): Promise<PsiBatchResult> {
  const limit = Math.max(1, Math.min(opts.limit ?? 5, 5));
  const strategy = opts.strategy === "desktop" ? "desktop" : "mobile";
  const urls = crawledUrlsForSite(site.domain, limit);
  const audited: PsiAuditResult[] = [];
  const skipped: string[] = [];
  const errors: Array<{ url: string; error: string }> = [];
  let quotaHit = false;

  for (let i = 0; i < urls.length; i++) {
    if (quotaHit) {
      skipped.push(...urls.slice(i));
      break;
    }
    const url = urls[i];
    try {
      const result = await runPsiAudit(site, url, strategy);
      audited.push(result);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      const msg = e instanceof Error ? e.message : "Erreur audit";
      if (status === 429) {
        quotaHit = true;
        errors.push({ url, error: msg });
        skipped.push(...urls.slice(i + 1));
        break;
      }
      errors.push({ url, error: msg });
    }
  }

  return { audited, skipped, quotaHit, errors, requested: urls.length };
}

/**
 * Origin-level CrUX summary from the most recent audits that carry fieldData.
 * Prefer the newest non-null fieldData (origin or URL experience persisted at audit time).
 */
export function originCruxSummary(siteId: string): {
  available: boolean;
  fieldData: PsiFieldData;
  sourceUrl: string | null;
  timestamp: string | null;
} {
  const history = psiAuditHistory(siteId, 40);
  for (const item of history) {
    if (item.fieldData && item.fieldData.overallCategory) {
      return {
        available: true,
        fieldData: item.fieldData,
        sourceUrl: item.url,
        timestamp: item.timestamp,
      };
    }
  }
  // Any fieldData even without overallCategory
  for (const item of history) {
    if (item.fieldData) {
      return {
        available: true,
        fieldData: item.fieldData,
        sourceUrl: item.url,
        timestamp: item.timestamp,
      };
    }
  }
  return { available: false, fieldData: null, sourceUrl: null, timestamp: null };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
