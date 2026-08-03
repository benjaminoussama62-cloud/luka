import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";

export async function GET() {
  try {
    const user = await getSessionFromCookies();
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
