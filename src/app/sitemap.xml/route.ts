import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function origin(req: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return "https://ayeba.app";
  }
}

// Pages publiques statiques — les pages d'auth, d'admin, de console et de
// studio restent volontairement hors sitemap (pas destinées à l'index).
const STATIC_PATHS = [
  "/",
  "/ayebi",
  "/ayebi/recent",
  "/ayebi/recherche",
  "/ayebi/contribuer",
  "/ayebi/legal",
  "/marches",
  "/mail",
  "/mbongo",
  "/mbongo/conditions",
  "/mbongo/suppression",
  "/telecharger",
  "/developers",
  "/developers/docs",
  "/developers/policy",
  "/legal",
  "/terms",
  "/droits",
  "/support",
  "/status",
  "/suppression-compte",
  "/privacy",
  "/privacy/mail",
  "/privacy/mbongo",
  "/privacy/navigateur",
  "/opensearch",
  "/mentions-legales",
];

export async function GET(req: Request) {
  const o = origin(req);
  const paths = new Map<string, { changefreq: string; priority: string }>();
  const add = (p: string, changefreq = "weekly", priority = "0.7") =>
    paths.set(p, { changefreq, priority });

  add("/", "hourly", "1.0");
  for (const p of STATIC_PATHS.slice(1)) add(p);

  // Contenu dynamique : articles, catégories et portails Ayebi.
  // En cas de DB indisponible, le sitemap reste servi (pages statiques seules).
  try {
    const { listArticles, listPortals } = await import("@/lib/ayebi/db-sqlite");
    const { AYEBI_CATEGORIES } = await import("@/lib/ayebi/constants");
    const { AYEBI_ARTICLES } = await import("@/lib/ayebi/index");
    const stored = listArticles();
    const slugs = stored.length > 0
      ? stored.map((a) => a.slug)
      : AYEBI_ARTICLES.map((a) => a.slug);
    for (const s of slugs) add(`/ayebi/${s}`, "weekly", "0.8");
    for (const p of listPortals()) add(`/ayebi/portail/${p.id}`, "weekly", "0.6");
    for (const c of AYEBI_CATEGORIES) add(`/ayebi/categorie/${c.id}`, "weekly", "0.6");
  } catch {
    // fallback silencieux : sitemap statique
  }

  const urls = [...paths.entries()]
    .map(
      ([p, m]) => `  <url>
    <loc>${o}${p}</loc>
    <changefreq>${m.changefreq}</changefreq>
    <priority>${m.priority}</priority>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
