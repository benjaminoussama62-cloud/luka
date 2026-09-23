/**
 * Cloudflare Email Worker — route les mails entrants @ayeba.app vers
 * le webhook https://ayeba.app/api/mail/inbound (Ayeba Mail).
 *
 * Installation : voir docs/mail-externe-setup.md
 * Secret : variable d'environnement MAIL_INBOUND_SECRET sur le Worker.
 *
 * Dépendance : PostalMime (parser MIME dans les Workers)
 *   import PostalMime from "postal-mime" — cf. wrangler.toml ci-dessous.
 */

import PostalMime from "postal-mime";

export default {
  async email(message, env, ctx) {
    const raw = await new Response(message.raw).arrayBuffer();
    const parsed = await PostalMime.parse(raw);

    const to = (parsed.to || []).map((t) => t.address);
    const fromAddr = parsed.from?.address || message.from;

    const res = await fetch("https://ayeba.app/api/mail/inbound", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-inbound-secret": env.MAIL_INBOUND_SECRET,
      },
      body: JSON.stringify({
        from: fromAddr,
        fromName: parsed.from?.name || "",
        to,
        subject: parsed.subject || "",
        text: parsed.text || "",
        html: parsed.html || "",
        messageId: parsed.messageId || message.headers.get("message-id") || "",
      }),
    });

    if (!res.ok) {
      // Ne pas rejeter brutalement (évite le backscatter) — on log pour diag.
      console.error("ayeba inbound webhook error", res.status, await res.text());
    }
  },
};
