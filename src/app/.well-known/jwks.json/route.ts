import { NextResponse } from "next/server";
import { getJwksDocument } from "@/lib/oauth-provider/jwks";

export const runtime = "nodejs";

export async function GET() {
  const jwks = await getJwksDocument();
  return NextResponse.json(jwks, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/json",
    },
  });
}
