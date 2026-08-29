import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** HS256 id_tokens — valider côté client avec client_secret (RFC 7519). */
export async function GET() {
  return NextResponse.json(
    { keys: [] },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    },
  );
}
