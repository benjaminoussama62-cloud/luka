import { NextResponse } from "next/server";
import { providerStartUrl } from "@/lib/oauth";
import { isAllowedOmegaReturn } from "@/lib/omega-cors";

export async function GET(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID / SECRET non configurés." }, { status: 503 });
  }
  const returnTo = new URL(req.url).searchParams.get("return") || "";
  if (!isAllowedOmegaReturn(returnTo)) {
    return NextResponse.json({ error: "URL de retour Omega non autorisée." }, { status: 400 });
  }
  const state = `omega|${returnTo}`;
  return NextResponse.redirect(providerStartUrl("google", { state }));
}
