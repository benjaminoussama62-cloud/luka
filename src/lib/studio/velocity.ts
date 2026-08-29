import { getDb } from "@/lib/storage/database";
import type { StudioSite, VelocityAudit, VelocityFinding, VelocityOverview } from "./types";

function analyzeHtml(html: string, headers: Headers, ttfbMs: number, htmlBytes: number): VelocityFinding[] {
  const findings: VelocityFinding[] = [];

  if (ttfbMs > 800) {
    findings.push({
      id: "ttfb-slow",
      severity: "critical",
      title: "Temps de réponse serveur élevé",
      detail: `TTFB ${ttfbMs} ms — visez < 600 ms (CDN, cache, hébergement).`,
      savingsMs: Math.max(0, ttfbMs - 500),
    });
  } else if (ttfbMs > 500) {
    findings.push({
      id: "ttfb-warn",
      severity: "warn",
      title: "TTFB perfectible",
      detail: `TTFB ${ttfbMs} ms — activez cache HTTP et compression.`,
      savingsMs: Math.max(0, ttfbMs - 400),
    });
  }

  if (htmlBytes > 500_000) {
    findings.push({
      id: "html-heavy",
      severity: "critical",
      title: "HTML trop lourd",
      detail: `${Math.round(htmlBytes / 1024)} Ko — réduisez le markup et différez le JS.`,
    });
  } else if (htmlBytes > 200_000) {
    findings.push({
      id: "html-warn",
      severity: "warn",
      title: "HTML volumineux",
      detail: `${Math.round(htmlBytes / 1024)} Ko — minifiez et supprimez le code mort.`,
    });
  }

  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
    findings.push({
      id: "no-viewport",
      severity: "warn",
      title: "Meta viewport manquante",
      detail: "Ajoutez viewport pour le mobile — impact Core Web Vitals.",
    });
  }

  const scriptCount = (html.match(/<script/gi) || []).length;
  if (scriptCount > 25) {
    findings.push({
      id: "scripts-many",
      severity: "warn",
      title: "Trop de scripts bloquants",
      detail: `${scriptCount} balises script — chargez en defer/async.`,
    });
  }

  const imgWithoutLazy = (html.match(/<img(?![^>]*loading=)/gi) || []).length;
  if (imgWithoutLazy > 5) {
    findings.push({
      id: "lazy-images",
      severity: "info",
      title: "Images sans lazy-load",
      detail: `${imgWithoutLazy} images — ajoutez loading="lazy" sous le fold.`,
    });
  }

  const encoding = headers.get("content-encoding") || "";
  if (!encoding.includes("br") && !encoding.includes("gzip")) {
    findings.push({
      id: "no-compress",
      severity: "warn",
      title: "Compression absente",
      detail: "Activez Brotli ou gzip sur le serveur.",
    });
  }

  if (!findings.length) {
    findings.push({
      id: "ok",
      severity: "info",
      title: "Base saine",
      detail: "Aucun problème majeur détecté sur cette URL.",
    });
  }

  return findings;
}

function scoreFrom(ttfbMs: number, htmlBytes: number, findings: VelocityFinding[]): number {
  let score = 100;
  score -= Math.min(35, Math.max(0, ttfbMs - 300) / 20);
  score -= Math.min(25, Math.max(0, htmlBytes - 100_000) / 20_000);
  for (const f of findings) {
    if (f.severity === "critical") score -= 12;
    else if (f.severity === "warn") score -= 6;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function runVelocityAudit(site: StudioSite, rawUrl?: string): Promise<VelocityAudit> {
  const url = rawUrl?.trim()
    ? rawUrl.includes("://")
      ? rawUrl
      : `https://${rawUrl}`
    : `https://${site.domain}/`;

  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host !== site.domain && !host.endsWith(`.${site.domain}`)) {
    throw Object.assign(new Error("URL hors de ce domaine"), { status: 400 });
  }

  const started = Date.now();
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "AyebaVelocityBot/1.0 (+https://ayeba.app/studio)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  const ttfbMs = Date.now() - started;
  const html = await res.text();
  const htmlBytes = new TextEncoder().encode(html).length;
  const findings = analyzeHtml(html, res.headers, ttfbMs, htmlBytes);
  const score = scoreFrom(ttfbMs, htmlBytes, findings);
  const now = new Date().toISOString();

  const result = getDb()
    .prepare(
      `INSERT INTO velocity_audits (site_id, url, score, ttfb_ms, html_bytes, findings_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(site.id, url, score, ttfbMs, htmlBytes, JSON.stringify(findings), now) as { lastInsertRowid: number | bigint };

  return {
    id: Number(result.lastInsertRowid),
    url,
    score,
    ttfbMs,
    htmlBytes,
    findings,
    createdAt: now,
  };
}

function rowToAudit(row: {
  id: number;
  url: string;
  score: number;
  ttfb_ms: number;
  html_bytes: number;
  findings_json: string;
  created_at: string;
}): VelocityAudit {
  let findings: VelocityFinding[] = [];
  try {
    findings = JSON.parse(row.findings_json) as VelocityFinding[];
  } catch {
    findings = [];
  }
  return {
    id: row.id,
    url: row.url,
    score: row.score,
    ttfbMs: row.ttfb_ms,
    htmlBytes: row.html_bytes,
    findings,
    createdAt: row.created_at,
  };
}

export function velocityOverview(site: StudioSite): VelocityOverview {
  const rows = getDb()
    .prepare(
      `SELECT id, url, score, ttfb_ms, html_bytes, findings_json, created_at
       FROM velocity_audits WHERE site_id = ? ORDER BY created_at DESC LIMIT 8`,
    )
    .all(site.id) as Parameters<typeof rowToAudit>[0][];

  const audits = rows.map(rowToAudit);
  const latest = audits[0];
  const actionPlan = (latest?.findings || [])
    .filter((f) => f.severity !== "info" || f.id === "ok")
    .sort((a, b) => {
      const rank = { critical: 0, warn: 1, info: 2 };
      return rank[a.severity] - rank[b.severity];
    })
    .slice(0, 5);

  return {
    domain: site.domain,
    latestScore: latest?.score ?? null,
    latestTtfbMs: latest?.ttfbMs ?? null,
    audits,
    actionPlan,
  };
}
