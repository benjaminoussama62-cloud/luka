import { NextResponse } from "next/server";
import { adServer } from "@/lib/studio/ad-server-core";
import { adCorsHeaders } from "@/lib/ads/sister-access";
import { hmacSha256, safeEqual, signingSecret } from "@/lib/security/sign";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const TYPES = new Set(["impression", "click", "viewthrough"]);

function expectedSig(type: string, requestId: string, creativeId: string) {
  return hmacSha256(signingSecret(), `ad:${type}:${requestId}:${creativeId}`).slice(0, 24);
}

/**
 * GET /api/ads/track?type=&request=&creative=&sig=
 * Beacon endpoint hit by the tracking URLs embedded in ad responses.
 * The HMAC signature prevents forged impressions/clicks.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const requestId = url.searchParams.get("request") || "";
  const creativeId = url.searchParams.get("creative") || "";
  const sig = url.searchParams.get("sig") || "";
  const cors = adCorsHeaders(req);

  if (!TYPES.has(type) || !requestId || !creativeId) {
    return NextResponse.json({ error: "paramètres invalides" }, { status: 400 });
  }
  if (!rateLimit(`adtrack:${clientIp(req)}`, 300, 60_000)) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  }
  if (!safeEqual(sig, expectedSig(type, requestId, creativeId))) {
    return NextResponse.json({ error: "signature invalide" }, { status: 403 });
  }

  const { landingUrl } = adServer.recordBeacon(
    type as "impression" | "click" | "viewthrough",
    requestId,
    creativeId,
    req,
  );

  if (type === "click") {
    if (!landingUrl) return NextResponse.json({ error: "expiré" }, { status: 410 });
    return NextResponse.redirect(landingUrl, 302);
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...cors,
    },
  });
}
