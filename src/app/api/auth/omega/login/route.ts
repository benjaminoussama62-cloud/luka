import { NextResponse } from "next/server";
import {
  createSessionToken,
  loginUser,
  registerUser,
  setSessionCookie,
} from "@/lib/auth-server";
import { omegaCorsHeaders, omegaPreflight } from "@/lib/omega-cors";

export async function OPTIONS(req: Request) {
  return omegaPreflight(req);
}

export async function POST(req: Request) {
  const cors = omegaCorsHeaders(req);
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      mode?: "login" | "register";
    };
    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";
    const mode = body.mode ?? "login";

    if (!email.includes("@") || password.length < 4) {
      return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400, headers: cors });
    }

    const result =
      mode === "register"
        ? await registerUser(email, password, body.name)
        : await loginUser(email, password);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401, headers: cors });
    }

    const token = await createSessionToken(result.user);
    await setSessionCookie(token);
    return NextResponse.json({ user: result.user, token }, { headers: cors });
  } catch (e) {
    console.error("[omega/login]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500, headers: cors },
    );
  }
}
