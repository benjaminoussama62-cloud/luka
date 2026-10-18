/**
 * Cloudflare Email Worker — route les mails entrants @ayeba.app vers
 * le webhook https://ayeba.app/api/mail/inbound (Ayeba Mail).
 *
 * Installation : voir docs/mail-externe-setup.md
 * Secret : variable d'environnement MAIL_INBOUND_SECRET sur le Worker.
 *
 * AUCUNE dépendance : le worker forwarde le message MIME brut
 * (content-type: message/rfc822) — le parsing se fait côté serveur
 * dans /api/mail/inbound via postal-mime.
 */

export default {
  async email(message, env) {
    const raw = await new Response(message.raw).text();

    const res = await fetch("https://ayeba.app/api/mail/inbound", {
      method: "POST",
      headers: {
        "content-type": "message/rfc822",
        "x-inbound-secret": env.MAIL_INBOUND_SECRET,
      },
      body: raw,
    });

    if (!res.ok) {
      // Ne pas rejeter brutalement (évite le backscatter) — on log pour diag.
      console.error("ayeba inbound webhook error", res.status, await res.text());
    }
  },
};
