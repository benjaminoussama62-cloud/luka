import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { createOAuthClient, listOAuthClientsByOwner } from "@/lib/oauth-provider/clients";
import { validateRedirectUriList } from "@/lib/oauth-provider/redirect-uri";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const apps = listOAuthClientsByOwner(auth.user.id);
  return NextResponse.json({ apps });
}

export async function POST(req: Request) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as {
    name?: string;
    description?: string;
    redirectUris?: string[];
  };

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const redirectUris = (body.redirectUris || []).map((u) => u.trim()).filter(Boolean);
  const uriCheck = validateRedirectUriList(redirectUris);
  if (!uriCheck.ok) return NextResponse.json({ error: uriCheck.error }, { status: 400 });

  const app = createOAuthClient({
    name,
    description: body.description,
    ownerUserId: auth.user.id,
    redirectUris,
  });

  return NextResponse.json({ app }, { status: 201 });
}
