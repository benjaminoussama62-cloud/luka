import { NextResponse } from "next/server";
import { getSiteByTraceKey } from "@/lib/studio/modules";
import { recordTraceEvent } from "@/lib/studio/trace";
import { traceEnterpriseV2 } from "@/lib/studio/trace-v2";
import { matchingGoals, markAttributionConversion } from "@/lib/studio/trace-goals";
import { recordConversionFromTrace } from "@/lib/studio/yield";
import { clientIp } from "@/lib/rate-limit";

/** Extract UTM/gclid/fbclid/ayb_click params from a path that may contain a query string. */
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
    aybClick: pick("ayb_click"),
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
      debug?: boolean;
      data?: Record<string, unknown>;
    };
    const key = String(body.k || "").trim();
    if (!key) return NextResponse.json({ error: "Clé manquante" }, { status: 400 });

    const site = getSiteByTraceKey(key);
    if (!site) return NextResponse.json({ error: "Clé invalide" }, { status: 403 });

    const path = body.path || "/";
    const sessionId = (body.sessionId || "").slice(0, 64);
    const eventType = body.eventType || "pageview";
    const ctx = utmContext(path);
    const aybClick =
      ctx.aybClick ||
      (typeof body.data?.ayb_click === "string" ? body.data.ayb_click : undefined);

    if (eventType === "pageview") {
      recordTraceEvent({
        siteId: site.siteId,
        path,
        referrer: body.referrer,
        sessionId,
      });
    }

    // Match conversion goals by event_type (real fires from collect pipeline).
    const goals = eventType !== "pageview" ? matchingGoals(site.siteId, eventType) : [];
    const goalValue = goals.length ? Math.max(...goals.map((g) => g.value)) : 0;
    const dataValue =
      typeof body.data?.value === "number"
        ? body.data.value
        : typeof body.data?.value === "string"
          ? Number(body.data.value)
          : undefined;
    const conversionValue =
      dataValue !== undefined && Number.isFinite(dataValue) ? dataValue : goalValue;

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
          context: ctx,
        };
        const enrichedData = {
          ...(body.data || {}),
          ...(goals.length
            ? { goals: goals.map((g) => ({ id: g.id, name: g.name, value: g.value })) }
            : {}),
          ...(conversionValue > 0 && body.data?.value === undefined ? { value: conversionValue } : {}),
        };
        if (eventType === "pageview") {
          await traceEnterpriseV2.trackPageView({ ...common, title: body.title });
        } else {
          await traceEnterpriseV2.trackEvent({
            ...common,
            eventType: String(eventType).slice(0, 64) || "event",
            title: body.title,
            durationMs: body.durationMs,
            scrollDepth: body.scrollDepth,
            data: enrichedData,
          });
        }

        // Goal hit or explicit conversion → mark attribution touchpoint.
        if (eventType === "conversion" || goals.length > 0) {
          markAttributionConversion({
            sessionId,
            siteId: site.siteId,
            value: conversionValue,
          });
        }
      } catch (e) {
        console.error("[trace] enhanced tracking failed", e);
      }
    }

    let yieldConversion: { conversionId: string } | undefined;
    if ((eventType === "conversion" || goals.length > 0) && aybClick) {
      const linked = recordConversionFromTrace({
        clickId: aybClick,
        conversionType:
          typeof body.data?.type === "string"
            ? body.data.type
            : goals[0]?.name || body.title || "conversion",
        value: Number.isFinite(conversionValue) ? conversionValue : 0,
        currency: typeof body.data?.currency === "string" ? body.data.currency : "CDF",
      });
      if (linked.ok) yieldConversion = { conversionId: linked.conversionId };
    }

    return NextResponse.json({
      ok: true,
      yieldConversion,
      goalsMatched: goals.map((g) => g.id),
      ...(body.debug ? { debug: true, eventType, aybClick: aybClick || null } : {}),
    });
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
