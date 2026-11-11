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
      `Cliquez ce lien pour vous connecter à Ayeba Mbongo (valable 15 min, usage unique) : ${link}`,
      "",
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce mail.",
      "— Ayeba",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#050507;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px 16px">
      <tr><td align="center"><table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#0d0f14;border:1px solid #1e2430;border-radius:16px;padding:32px 28px">
        <tr><td>
          <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#eafcff;letter-spacing:2px">AYEBA</p>
          <p style="margin:0 0 22px;font-size:10px;color:#7df0ff;letter-spacing:3px">CONNEXION SÉCURISÉE</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#c8d4dd">
            Bonjour,<br><br>
            Voici votre lien de connexion pour <b style="color:#eafcff">Ayeba Mbongo</b> — valable <b>15 minutes</b>, utilisable <b>une seule fois</b> :
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 20px">
            <a href="${link}" style="display:inline-block;background:linear-gradient(90deg,#1a7f96,#e85d04);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:1px;padding:14px 34px;border-radius:12px">
              SE CONNECTER
            </a>
          </td></tr></table>
          <p style="margin:0 0 16px;font-size:11px;line-height:1.5;color:#5a6674">
            Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>
            <a href="${link}" style="color:#7df0ff;word-break:break-all">${link}</a>
          </p>
          <p style="margin:0;font-size:11px;line-height:1.5;color:#5a6674;border-top:1px solid #1e2430;padding-top:14px">
            Si vous n'êtes pas à l'origine de cette demande, ignorez ce mail — votre compte reste protégé.
          </p>
        </td></tr>
      </table></td></tr>
      </table>
    </body></html>`,
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
