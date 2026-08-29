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

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID / SECRET non configurés." }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const ret = safeInternalReturn(searchParams.get("return"));
  const state = ret ? `ayeba|${ret}` : undefined;
  return NextResponse.redirect(providerStartUrl("google", { state }));
}
