import { NextResponse } from "next/server";
import {
  createSessionToken,
  loginUser,
  registerUser,
  setSessionCookie,
} from "@/lib/auth-server";

export async function POST(req: Request) {
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
      return NextResponse.json({ error: "Email ou mot de passe invalide." }, { status: 400 });
    }

    const result =
      mode === "register"
        ? await registerUser(email, password, body.name)
        : await loginUser(email, password);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const token = await createSessionToken(result.user);
    await setSessionCookie(token);
    return NextResponse.json({ user: result.user });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
