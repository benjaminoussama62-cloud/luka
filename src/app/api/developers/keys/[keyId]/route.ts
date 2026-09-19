import { NextResponse } from "next/server";
import { requireDeveloperSession } from "@/lib/developers/session";
import { revokeApiKey, updateApiKey, type ApiKeyRestrictions } from "@/lib/developers/console";

export const runtime = "nodejs";

type Params = { params: Promise<{ keyId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { keyId } = await params;
  const body = (await req.json()) as {
    name?: string;
    restrictions?: ApiKeyRestrictions;
    quotaPerDay?: number;
    status?: "active" | "disabled";
  };
  const key = updateApiKey(keyId, auth.user.id, body);
  if (!key) return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  return NextResponse.json({ key });
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireDeveloperSession();
  if ("error" in auth) return auth.error;
  const { keyId } = await params;
  if (!revokeApiKey(keyId, auth.user.id)) {
    return NextResponse.json({ error: "Clé introuvable" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
