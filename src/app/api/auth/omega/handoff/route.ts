import { NextResponse } from "next/server";
import { createSessionToken, getSessionFromCookies } from "@/lib/auth-server";
import { isAllowedOmegaReturn } from "@/lib/omega-cors";

export async function GET(req: Request) {
  const returnTo = new URL(req.url).searchParams.get("return") || "";
  if (!isAllowedOmegaReturn(returnTo)) {
    return NextResponse.json({ error: "Retour Omega non autorisé." }, { status: 400 });
  }
  const user = await getSessionFromCookies();
  if (!user) {
    const enter = new URL("/omega/entrer", req.url);
    enter.searchParams.set("return", returnTo);
    enter.searchParams.set("form", "1");
    return NextResponse.redirect(enter);
  }
  const token = await createSessionToken(user);
  const dest = new URL(returnTo);
  dest.searchParams.set("ayeba_token", token);
  return NextResponse.redirect(dest.toString());
}
