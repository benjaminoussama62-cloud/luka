import { NextResponse } from "next/server";
import { changeManagedUserRole, createManagedUser, requireAdmin } from "@/lib/admin";
import type { AdminRole } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireAdmin("superadmin");
  if ("error" in auth) return auth.error;
  const body = (await req.json()) as { action?: "create" | "role"; id?: string; name?: string; email?: string; password?: string; role?: AdminRole };
  try {
    if (body.action === "role" && body.id && body.role) {
      return NextResponse.json({ updated: changeManagedUserRole(auth.user, body.id, body.role) });
    }
    if (!body.name || !body.email || !body.password || !body.role) return NextResponse.json({ error: "Nom, email, mot de passe et rôle requis." }, { status: 400 });
    return NextResponse.json({ user: await createManagedUser({ actor: auth.user, name: body.name, email: body.email, password: body.password, role: body.role }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Opération refusée." }, { status: 400 });
  }
}
