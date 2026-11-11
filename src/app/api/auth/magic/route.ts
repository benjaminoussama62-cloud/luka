import { NextResponse } from "next/server";
import crypto from "crypto";
import { moneyDb } from "@/lib/money/db";
import { sendExternalMail } from "@/lib/mail/smtp";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createSessionToken, setSessionCookie, registerUser } from "@/lib/auth-server";
import { findUserByEmail, type DbUser } from "@/lib/db";

export const runtime = "nodejs";

const TTL_MS = 15 * 60_000;

/** POST /api/auth/magic — {email, next} : envoie le lien de connexion. */
export async function POST(req: Request) {
  if (!(await rateLimit(`magic:${clientIp(req)}`, 6, 60_000))) return rateLimitResponse();
  let body: { email?: string; next?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const email = String(body.email || "").trim().toLowerCase();
  const next = String(body.next || "/mbongo");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !next.startsWith("/")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  const token = crypto.randomBytes(24).toString("base64url");
  const d = await moneyDb();
  const now = new Date().toISOString();
  await d.run(
    `INSERT INTO magic_tokens (token, email, next, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    [token, email, next, new Date(Date.now() + TTL_MS).toISOString(), now],
  );
  const origin = new URL(req.url).origin;
  const link = `${origin}/api/auth/magic?t=${token}`;
  await sendExternalMail({
    from: "noreply@ayeba.app",
    fromName: "Ayeba",
    to: email,
    subject: "Ayeba — Votre lien de connexion",
    text: [
      "Bonjour,",
      "",
      "Voici votre lien de connexion sécurisé (valable 15 minutes, usage unique) :",
      "",
      link,
      "",
      "Il vous connecte à Ayeba Mbongo directement dans l'application.",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce mail.",
      "",
      "— Ayeba",
    ].join("\n"),
  });
  // Réponse identique email connu ou non — pas d'énumération de comptes.
  return NextResponse.json({ sent: true });
}

/** GET /api/auth/magic?t=<token> — consomme le lien, crée la session, redirige. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") || "";
  const d = await moneyDb();
  const row = (await d.get("SELECT * FROM magic_tokens WHERE token = ?", [token])) as
    | { email: string; next: string; expires_at: string; used_at: string | null }
    | undefined;
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/connexion?error=${encodeURIComponent(msg)}`, req.url));

  if (!row || row.used_at) return fail("Lien invalide ou déjà utilisé");
  if (new Date(row.expires_at).getTime() < Date.now()) return fail("Lien expiré — demandez-en un nouveau");
  await d.run("UPDATE magic_tokens SET used_at = ? WHERE token = ?", [new Date().toISOString(), token]);

  let user = await findUserByEmail(row.email);
  if (!user) {
    // Compte créé au premier lien magique — mot de passe aléatoire interne,
    // l'utilisateur se connecte toujours par lien magique.
    const r = await registerUser(row.email, crypto.randomBytes(16).toString("hex"));
    user = (r as { user?: DbUser }).user ?? null;
  }
  if (!user) return fail("Compte introuvable");

  const session = await createSessionToken(user);
  await setSessionCookie(session);
  return NextResponse.redirect(new URL(row.next, req.url));
}
