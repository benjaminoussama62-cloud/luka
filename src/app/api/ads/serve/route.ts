import { NextResponse } from "next/server";
import { adServer } from "@/lib/studio/ad-server-core";
import {
  adCorsHeaders,
  findSisterApp,
  verifyAdKey,
} from "@/lib/ads/sister-access";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { AdRequest } from "@/lib/studio/ad-network-types";

export const runtime = "nodejs";

/**
 * POST /api/ads/serve — ad request from a sister app.
 * Auth: X-Ayeba-Ad-Key header (per-app key, env AD_KEY_<SLUG>).
 * Body: { app, placementId, format, size, pageUrl, keywords?, categories?,
 *         sessionId?, userId?, geo?, device? }
 */
export async function POST(req: Request) {
  let body: {
    app?: string;
    placementId?: string;
    format?: string;
    size?: string;
    pageUrl?: string;
    keywords?: string[];
    categories?: string[];
    sessionId?: string;
    userId?: string;
    geo?: { country?: string; region?: string; city?: string };
    device?: { type?: "desktop" | "mobile" | "tablet"; os?: string; browser?: string };
    referrer?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const app = findSisterApp(body.app || "");
  const cors = adCorsHeaders(req, app?.slug);
  if (!app) {
    return NextResponse.json({ error: "app inconnue" }, { status: 400, headers: cors });
  }

  const key = req.headers.get("x-ayeba-ad-key") || "";
  if (!verifyAdKey(app.slug, key)) {
    return NextResponse.json({ error: "Clé publicitaire invalide" }, { status: 401, headers: cors });
  }

  const ip = clientIp(req);
  if (!rateLimit(`ads:${app.slug}:${ip}`, 120, 60_000)) {
    return rateLimitResponse();
  }

  // The ad request domain must match one of the app's own domains.
  let domain = "";
  try {
    domain = new URL(body.pageUrl || "").hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    /* fall through */
  }
  if (!app.domains.some((d) => d === domain || `www.${d}` === domain)) {
    return NextResponse.json(
      { error: "pageUrl hors domaine de l'app" },
      { status: 403, headers: cors },
    );
  }

  if (!body.placementId || !body.format) {
    return NextResponse.json(
      { error: "placementId et format requis" },
      { status: 400, headers: cors },
    );
  }

  const ua = req.headers.get("user-agent") || "";
  const VALID_SIZES = new Set([
    "728x90",
    "300x250",
    "160x600",
    "320x50",
    "300x600",
    "responsive",
    "custom",
  ]);
  const size = VALID_SIZES.has(body.size || "") ? body.size! : "responsive";

  const adRequest: AdRequest = {
    requestId: `req-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    domain: domain as AdRequest["domain"],
    placementId: body.placementId,
    format: body.format as AdRequest["format"],
    size: size as AdRequest["size"],
    userAgent: ua,
    ip,
    userId: body.userId,
    sessionId: body.sessionId,
    pageUrl: body.pageUrl || "",
    referrer: body.referrer,
    context: {
      keywords: body.keywords?.slice(0, 20),
      categories: body.categories?.slice(0, 10),
    },
    targeting: {
      geo: body.geo?.country
        ? { country: body.geo.country, region: body.geo.region, city: body.geo.city }
        : undefined,
      device: body.device?.type
        ? {
            type: body.device.type,
            os: body.device.os || "",
            browser: body.device.browser || "",
          }
        : undefined,
    },
  };

  const response = await adServer.processRequest(adRequest);
  return NextResponse.json(response, { headers: cors });
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: adCorsHeaders(req) });
}
