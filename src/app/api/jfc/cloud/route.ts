import { NextResponse } from "next/server";
import { readSessionToken } from "@/lib/auth-server";
import { jfcCorsHeaders, jfcPreflight } from "@/lib/jfc-cors";
import { jfcGetCloudSave, jfcPutCloudSave } from "@/lib/jfc-store";

async function userFromReq(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  return readSessionToken(token);
}

export async function OPTIONS(req: Request) {
  return jfcPreflight(req);
}

export async function GET(req: Request) {
  const cors = jfcCorsHeaders(req);
  const user = await userFromReq(req);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401, headers: cors });
  const row = jfcGetCloudSave(user.id);
  if (!row) return NextResponse.json({ save_b64: "", revision: 0 }, { headers: cors });
  const save_b64 = Buffer.from(row.save_json, "utf8").toString("base64");
  return NextResponse.json(
    { save_b64, revision: row.revision, updated_at: row.updated_at },
    { headers: cors },
  );
}

export async function POST(req: Request) {
  const cors = jfcCorsHeaders(req);
  const user = await userFromReq(req);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401, headers: cors });
  const body = (await req.json()) as { save?: string; save_b64?: string; revision?: number };
  let saveJson = body.save ?? "";
  if (body.save_b64) {
    try {
      saveJson = Buffer.from(body.save_b64, "base64").toString("utf8");
    } catch {
      return NextResponse.json({ error: "Sauvegarde invalide (base64)." }, { status: 400, headers: cors });
    }
  }
  if (!saveJson || saveJson.length > 2_000_000) {
    return NextResponse.json({ error: "Sauvegarde invalide." }, { status: 400, headers: cors });
  }
  const out = jfcPutCloudSave(user.id, saveJson, body.revision ?? 0);
  if (!out.ok) {
    return NextResponse.json({ error: "Conflit de révision.", server: out.server }, { status: 409, headers: cors });
  }
  return NextResponse.json({ revision: out.revision, updated_at: out.updated_at }, { headers: cors });
}
