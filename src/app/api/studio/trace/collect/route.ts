import { NextResponse } from "next/server";
import { getSiteByTraceKey } from "@/lib/studio/modules";
import { recordTraceEvent } from "@/lib/studio/trace";
import { traceEnterpriseV2 } from "@/lib/studio/trace-v2";
import { clientIp } from "@/lib/rate-limit";

/** Extract UTM/gclid/fbclid params from a path that may contain a query string. */
function utmContext(path: string) {
  const qs = path.includes("?") ? path.split("?")[1] : "";
  const p = new URLSearchParams(qs);
  const pick = (k: string) => p.get(k) || undefined;
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
    utmTerm: pick("utm_term"),
    gclid: pick("gclid"),
    fbclid: pick("fbclid"),
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      k?: string;
      path?: string;
      referrer?: string;
      sessionId?: string;
      title?: string;
      eventType?: string;
      durationMs?: number;
      scrollDepth?: number;
      screenResolution?: string;
      language?: string;
      timezone?: string;
      data?: Record<string, unknown>;
    };
    const key = String(body.k || "").trim();
    if (!key) return NextResponse.json({ error: "Clé manquante" }, { status: 400 });

    const site = getSiteByTraceKey(key);
    if (!site) return NextResponse.json({ error: "Clé invalide" }, { status: 403 });

    const path = body.path || "/";
    const sessionId = (body.sessionId || "").slice(0, 64);
    const eventType = body.eventType || "pageview";

    if (eventType === "pageview") {
      // v1 counters (powers the existing Trace overview)
      recordTraceEvent({
        siteId: site.siteId,
        path,
        referrer: body.referrer,
        sessionId,
      });
    }

    // v2 enhanced pipeline — sessions, devices, geo, UTM, attribution, events
    if (sessionId) {
      try {
        const common = {
          siteId: site.siteId,
          sessionId,
          pageUrl: path,
          referrer: body.referrer,
          userAgent: req.headers.get("user-agent") || "",
          ip: clientIp(req),
          screenResolution: body.screenResolution,
          language: body.language,
          timezone: body.timezone,
          context: utmContext(path),
        };
        if (eventType === "pageview") {
          await traceEnterpriseV2.trackPageView({ ...common, title: body.title });
        } else {
          await traceEnterpriseV2.trackEvent({
            ...common,
            eventType: eventType as "scroll" | "click" | "conversion" | "engagement" | "event" | "custom",
            title: body.title,
            durationMs: body.durationMs,
            scrollDepth: body.scrollDepth,
            data: body.data,
          });
        }
      } catch (e) {
        console.error("[trace] enhanced tracking failed", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
