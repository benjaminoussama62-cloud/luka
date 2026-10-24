import { NextResponse } from "next/server";
import { providerStartUrl } from "@/lib/oauth";

function safeInternalReturn(raw: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const path = raw.startsWith("/") ? raw : new URL(raw).pathname + new URL(raw).search;
    if (!path.startsWith("/oauth/authorize")) return undefined;
    return path;
  } catch {
    return raw.startsWith("/oauth/authorize") ? raw : undefined;
  }
}

/** Chemin interne quelconque (post-login ?next=) — jamais externe ni //… */
function safeInternalNext(raw: string | null): string | undefined {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID / SECRET non configurés." }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const ret = safeInternalReturn(searchParams.get("return"));
  const next = safeInternalNext(searchParams.get("next"));
  const state = ret ? `ayeba|${ret}` : next ? `next|${next}` : undefined;
  return NextResponse.redirect(providerStartUrl("google", { state }));
}
