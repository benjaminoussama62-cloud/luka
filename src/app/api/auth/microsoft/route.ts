import { NextResponse } from "next/server";
import { getOAuthProviders, providerStartUrl } from "@/lib/oauth";

export async function GET() {
  const gh = getOAuthProviders().find((p) => p.id === "github");
  if (!gh?.configured) {
    return NextResponse.json({ error: "GitHub OAuth non configuré." }, { status: 503 });
  }
  return NextResponse.redirect(providerStartUrl("github"));
}
