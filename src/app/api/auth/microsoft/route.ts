import { NextResponse } from "next/server";
import { getOAuthProviders, providerStartUrl } from "@/lib/oauth";

export async function GET() {
  const ms = getOAuthProviders().find((p) => p.id === "microsoft");
  if (!ms?.configured) {
    return NextResponse.json({ error: "Microsoft OAuth non configuré." }, { status: 503 });
  }
  return NextResponse.redirect(providerStartUrl("microsoft"));
}
