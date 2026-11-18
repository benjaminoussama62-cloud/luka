import { NextResponse } from "next/server";
import { requireSection } from "@/lib/admin/auth";
import { listFlags, setFlag, KNOWN_FLAGS } from "@/lib/flags";
import { adb } from "@/lib/storage/adb";

export const runtime = "nodejs";

/** GET /api/admin/flags — état de tous les feature flags. */
export async function GET() {
  const auth = await requireSection("system");
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ ok: true, flags: await listFlags(), known: Object.keys(KNOWN_FLAGS) });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message || e) }, { status: 500 });
  }
}

/** POST /api/admin/flags — bascule un flag. {key, enabled, note?} */
export async function POST(req: Request) {
  const auth = await requireSection("system");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as
    | { key?: string; enabled?: boolean; note?: string }
    | null;
  const key = String(body?.key || "").trim().toLowerCase();
  if (!key || !/^[a-z0-9._-]{2,64}$/.test(key) || typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "key (a-z0-9._-) et enabled (booléen) requis" }, { status: 400 });
  }

  await setFlag(key, body.enabled, auth.admin?.id ?? null, body.note);

  try {
    await adb().run(`INSERT INTO admin_audit_log (id, admin_id, admin_name, action, entity_type, entity_id, changes, timestamp)
       VALUES (?, ?, ?, 'flag_toggle', 'flag', ?, ?, ?)`, [
        crypto.randomUUID(),
        auth.admin?.id ?? "env",
        auth.admin?.name ?? auth.user.name,
        key,
        JSON.stringify({ enabled: body.enabled, note: body.note ?? null }),
        new Date().toISOString(),
      ]);
  } catch {
    /* audit best-effort */
  }

  return NextResponse.json({ ok: true, key, enabled: body.enabled });
}
