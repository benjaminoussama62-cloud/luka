import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { addressAvailable, validateAddress } from "@/lib/mail/mail";

export async function GET(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const local = new URL(req.url).searchParams.get("local") || "";
  const check = validateAddress(local);
  if (!check.ok) return NextResponse.json({ ok: false, reason: check.reason });
  return NextResponse.json({ ok: true, available: addressAvailable(local.toLowerCase()) });
}
