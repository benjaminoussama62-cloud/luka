import { NextResponse } from "next/server";
import { jfcCorsHeaders, jfcPreflight } from "@/lib/jfc-cors";
import { jfcLiveConfig } from "@/lib/jfc-store";

export async function OPTIONS(req: Request) {
  return jfcPreflight(req);
}

export async function GET(req: Request) {
  const cors = jfcCorsHeaders(req);
  return NextResponse.json(jfcLiveConfig(), { headers: cors });
}
