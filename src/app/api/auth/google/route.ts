import { NextResponse } from "next/server";
import { providerStartUrl } from "@/lib/oauth";

export async function GET() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID / SECRET non configurés." }, { status: 503 });
  }
  return NextResponse.redirect(providerStartUrl("google"));
}
