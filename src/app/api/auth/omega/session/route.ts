import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth-server";
import { omegaCorsHeaders, omegaPreflight } from "@/lib/omega-cors";

export async function OPTIONS(req: Request) {
  return omegaPreflight(req);
}

export async function GET(req: Request) {
  const cors = omegaCorsHeaders(req);
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ user: null }, { headers: cors });
  }
  const user = await readSessionToken(token);
  return NextResponse.json({ user }, { headers: cors });
}
