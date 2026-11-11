import { suppressAddress } from "@/lib/mail/transactional";

export const runtime = "nodejs";

/**
 * GET/POST /api/mail/unsubscribe?a=<adresse>&app=<app>
 *
 * Cible du header `List-Unsubscribe` des envois transactionnels.
 * POST = RFC 8058 (un clic depuis Gmail — pas de page de confirmation).
 * GET = lien dans le corps du mail → petite page de confirmation.
 * Aucun secret n'est requis : retirer une adresse d'une liste ne peut
 * qu'arrêter du spam, jamais en causer.
 */

const done = () =>
  new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ayeba — désabonnement</title></head>
<body style="margin:0;font-family:system-ui,sans-serif;background:#0a0e14;color:#e6edf3;
display:flex;align-items:center;justify-content:center;min-height:100vh">
<div style="max-width:420px;padding:32px;text-align:center">
<div style="font-size:20px;font-weight:700;letter-spacing:.02em;margin-bottom:12px">
<span style="color:#4c8dff">AYEBA</span> MAIL</div>
<p style="color:#9aa7b4;line-height:1.6">Cette adresse ne recevra plus de
notifications de cette application. Les mails de sécurité (codes,
récupération de compte) restent actifs.</p></div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function suppress(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("a") || "").trim().toLowerCase();
  if (address && address.includes("@") && address.length <= 254) {
    await suppressAddress(address, "unsubscribe", "user");
  }
}

export async function GET(req: Request) {
  await suppress(req);
  return done();
}

export async function POST(req: Request) {
  await suppress(req);
  return new Response(null, { status: 200 });
}
