import { NextResponse } from "next/server";

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

export async function GET(req: Request) {
  const o = origin(req);
  const paths = [
    "/",
    "/ayebi",
    "/marches",
    "/opensearch",
    "/legal",
    "/privacy",
    "/terms",
    "/mentions-legales",
  ];
  const urls = paths
    .map(
      (p) => `  <url>
    <loc>${o}${p}</loc>
    <changefreq>${p === "/" ? "hourly" : "weekly"}</changefreq>
    <priority>${p === "/" ? "1.0" : "0.7"}</priority>
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
