import { NextResponse } from "next/server";
import { adminLogin, setAdminCookie } from "@/lib/admin/session";

export const runtime = "nodejs";

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    totpCode?: string;
  } | null;
  if (!body?.email || !body.password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const result = await adminLogin({
    email: body.email,
    password: body.password,
    totpCode: body.totpCode,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent") ?? "",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, totpRequired: result.totpRequired === true },
      { status: result.totpRequired ? 401 : 401 },
    );
  }

  await setAdminCookie(result.token);
  return NextResponse.json({
    admin: { name: result.admin.name, email: result.admin.email, role: result.admin.role },
  });
}
