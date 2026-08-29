import { NextResponse } from "next/server";
import { openIdConfiguration } from "@/lib/oauth-provider/oidc";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(openIdConfiguration(), {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
