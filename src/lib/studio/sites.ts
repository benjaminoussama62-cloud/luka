import { randomBytes } from "crypto";
import { getDb } from "@/lib/storage/database";
import type { SessionUser } from "@/lib/auth-server";
import type { StudioSite, StudioSiteStatus } from "./types";

function rowToSite(r: {
  id: string;
  user_id: string;
  domain: string;
  display_name: string;
  sitemap_url: string;
  status: string;
  verify_token: string;
  verified_at: string | null;
  created_at: string;
}): StudioSite {
  return {
    id: r.id,
    userId: r.user_id,
    domain: r.domain,
    displayName: r.display_name,
    sitemapUrl: r.sitemap_url,
    status: r.status as StudioSiteStatus,
    verifyToken: r.verify_token,
    verifiedAt: r.verified_at,
    createdAt: r.created_at,
  };
}

/** Normalize user input to apex-ish hostname (lowercase, no www, no path). */
export function normalizeDomain(input: string): string | null {
  let raw = String(input || "").trim().toLowerCase();
  if (!raw) return null;
  raw = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  raw = raw.replace(/^www\./, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(raw)) {
    return null;
  }
  return raw;
}

export function domainMatchesHost(siteDomain: string, host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  const d = siteDomain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith(`.${d}`);
}

function newId() {
  return `site_${randomBytes(10).toString("hex")}`;
}

function newToken() {
  return randomBytes(16).toString("hex");
}

export function listSitesForUser(userId: string): StudioSite[] {
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at
       FROM studio_sites WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as Parameters<typeof rowToSite>[0][];
  return rows.map(rowToSite);
}

export function getSiteById(id: string): StudioSite | null {
  const row = getDb()
    .prepare(
      `SELECT id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at
       FROM studio_sites WHERE id = ?`,
    )
    .get(id) as Parameters<typeof rowToSite>[0] | undefined;
  return row ? rowToSite(row) : null;
}

export function requireOwnedSite(user: SessionUser, siteId: string): StudioSite {
  const site = getSiteById(siteId);
  if (!site || site.userId !== user.id) {
    throw new StudioAuthError("Site introuvable", 404);
  }
  return site;
}

export class StudioAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function createSite(
  userId: string,
  input: { domain: string; displayName?: string; sitemapUrl?: string },
): StudioSite {
  const domain = normalizeDomain(input.domain);
  if (!domain) throw new StudioAuthError("Domaine invalide", 400);

  const id = newId();
  const token = newToken();
  const now = new Date().toISOString();
  const displayName = (input.displayName || domain).trim().slice(0, 120);
  const sitemapUrl = (input.sitemapUrl || "").trim().slice(0, 500);

  try {
    getDb()
      .prepare(
        `INSERT INTO studio_sites
         (id, user_id, domain, display_name, sitemap_url, status, verify_token, verified_at, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`,
      )
      .run(id, userId, domain, displayName, sitemapUrl, token, now);
  } catch {
    throw new StudioAuthError("Ce domaine est déjà lié à votre compte", 409);
  }

  return getSiteById(id)!;
}

export function updateSite(
  siteId: string,
  patch: { displayName?: string; sitemapUrl?: string },
): StudioSite {
  const site = getSiteById(siteId);
  if (!site) throw new StudioAuthError("Site introuvable", 404);
  const displayName =
    patch.displayName !== undefined ? patch.displayName.trim().slice(0, 120) : site.displayName;
  const sitemapUrl =
    patch.sitemapUrl !== undefined ? patch.sitemapUrl.trim().slice(0, 500) : site.sitemapUrl;
  getDb()
    .prepare(`UPDATE studio_sites SET display_name = ?, sitemap_url = ? WHERE id = ?`)
    .run(displayName, sitemapUrl, siteId);
  return getSiteById(siteId)!;
}

export function markSiteVerified(siteId: string) {
  getDb()
    .prepare(`UPDATE studio_sites SET status = 'verified', verified_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), siteId);
}

export function deleteSite(siteId: string, userId: string) {
  const site = getSiteById(siteId);
  if (!site || site.userId !== userId) throw new StudioAuthError("Site introuvable", 404);
  getDb().prepare(`DELETE FROM studio_site_urls WHERE site_id = ?`).run(siteId);
  getDb().prepare(`DELETE FROM studio_sites WHERE id = ?`).run(siteId);
}

export function recordSubmittedUrl(siteId: string, url: string, source: string) {
  getDb()
    .prepare(
      `INSERT INTO studio_site_urls (site_id, url, source, submitted_at)
       VALUES (?, ?, ?, ?) ON CONFLICT(site_id, url) DO NOTHING`,
    )
    .run(siteId, url, source, new Date().toISOString());
}

export function countSubmittedUrls(siteId: string): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) as c FROM studio_site_urls WHERE site_id = ?`)
    .get(siteId) as { c: number };
  return row?.c ?? 0;
}
