import { NextResponse } from "next/server";
import { getOAuthProviders } from "@/lib/oauth";

export async function GET() {
  const providers = getOAuthProviders().map(({ id, label, authPath, configured, brandColor }) => ({
    id,
    label,
    authPath,
    configured,
    brandColor,
  }));
  return NextResponse.json({ providers });
}
