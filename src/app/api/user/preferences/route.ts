import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { getPreferences, savePreferences } from "@/lib/user-preferences";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }
  return NextResponse.json({ preferences: getPreferences(session.id) });
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const body = (await req.json()) as Partial<{
    safesearch: boolean;
    region: string;
    language: string;
    theme: string;
  }>;

  const preferences = savePreferences(session.id, body);
  return NextResponse.json({ preferences });
}
