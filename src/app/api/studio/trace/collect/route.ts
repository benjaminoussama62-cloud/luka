import { NextResponse } from "next/server";
import { getSiteByTraceKey } from "@/lib/studio/modules";
import { recordTraceEvent } from "@/lib/studio/trace";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      k?: string;
      path?: string;
      referrer?: string;
      sessionId?: string;
    };
    const key = String(body.k || "").trim();
    if (!key) return NextResponse.json({ error: "Clé manquante" }, { status: 400 });

    const site = getSiteByTraceKey(key);
    if (!site) return NextResponse.json({ error: "Clé invalide" }, { status: 403 });

    recordTraceEvent({
      siteId: site.siteId,
      path: body.path || "/",
      referrer: body.referrer,
      sessionId: body.sessionId,
    });

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
