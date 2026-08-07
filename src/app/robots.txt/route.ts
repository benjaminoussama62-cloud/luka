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
  const body = `User-agent: *
Allow: /
Allow: /ayebi
Allow: /marches
Allow: /opensearch
Allow: /legal
Allow: /privacy
Allow: /terms
Allow: /mentions-legales
Disallow: /api/
Disallow: /status
Disallow: /ayebi/*/modifier

Sitemap: ${o}/sitemap.xml
`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
