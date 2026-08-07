import { NextResponse } from "next/server";
import { getRecentEdits } from "@/lib/ayebi/server";

export async function GET() {
  const edits = await getRecentEdits(40);
  return NextResponse.json({ edits });
}
