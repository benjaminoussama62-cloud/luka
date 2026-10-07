import { NextResponse } from "next/server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createSessionToken, loginUser, registerUser } from "@/lib/auth-server";
import { jfcCorsHeaders, jfcPreflight } from "@/lib/jfc-cors";

export async function OPTIONS(req: Request) {
  return jfcPreflight(req);
}

export async function POST(req: Request) {
  const cors = jfcCorsHeaders(req);
  try {
    if (!rateLimit(`jfc-auth:${clientIp(req)}`, 20, 60_000)) {
      return rateLimitResponse();
    }
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      platform?: string;
      mode?: "login" | "register";
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const mode = body.mode ?? "login";
    if (!email.includes("@") || password.length < 8) {
      return NextResponse.json({ error: "Email ou mot de passe invalide (8+ caractères)." }, { status: 400, headers: cors });
    }
    const display =
      body.name?.trim() ||
      [body.firstName, body.lastName].filter(Boolean).join(" ").trim() ||
      email.split("@")[0];

    const result =
      mode === "register"
        ? await registerUser(email, password, display)
        : await loginUser(email, password);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401, headers: cors });
    }

    const token = await createSessionToken(result.user);
    return NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          platform: body.platform || "pc",
        },
        token,
      },
      { headers: cors },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur JFC." }, { status: 500, headers: cors });
  }
}
