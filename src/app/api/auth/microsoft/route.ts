import { NextResponse } from "next/server";
import { getOAuthProviders, providerStartUrl } from "@/lib/oauth";

function safeNext(raw: string | null): string | undefined {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;
  return raw;
}

export async function GET(req: Request) {
  const ms = getOAuthProviders().find((p) => p.id === "microsoft");
  if (!ms?.configured) {
    return NextResponse.json({ error: "Microsoft OAuth non configuré." }, { status: 503 });
  }
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  return NextResponse.redirect(
    providerStartUrl("microsoft", { state: next ? `next|${next}` : undefined }),
  );
}
