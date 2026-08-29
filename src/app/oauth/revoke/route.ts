import { NextResponse } from "next/server";
import { revokeToken } from "@/lib/oauth-provider/tokens";

export const runtime = "nodejs";

/** POST /oauth/revoke */
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  const token =
    (fd?.get("token") as string | null)?.trim() ||
    (await req.json().catch(() => ({}))).token?.trim?.();

  if (token) revokeToken(token);
  return new NextResponse(null, { status: 200 });
}
