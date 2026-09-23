/**
 * Ayeba Mail — livraison externe (SMTP sortant).
 * Provider-agnostique : tout relais SMTP compatible fonctionne via variables
 * d'environnement. Presets documentés dans docs/mail-externe-setup.md :
 * Brevo (gratuit 300/j), Gmail SMTP, ou tout autre relais.
 *
 * DKIM optionnel : si DKIM_PRIVATE_KEY + DKIM_SELECTOR sont configurés, les
 * messages sortants sont signés (déliverabilité Gmail/Outlook).
 */
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { smtpConfigured } from "./mail";

let transporter: Transporter | null | undefined;

const MAIL_DOMAIN = "ayeba.app";

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!smtpConfigured()) return (transporter = null);
  const dkimKey = process.env.DKIM_PRIVATE_KEY?.replace(/\\n/g, "\n");
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(dkimKey && process.env.DKIM_SELECTOR
      ? {
          dkim: {
            domainName: process.env.DKIM_DOMAIN || MAIL_DOMAIN,
            keySelector: process.env.DKIM_SELECTOR,
            privateKey: dkimKey,
          },
        }
      : {}),
  });
  return transporter;
}

export type ExternalSendResult =
  | { ok: true }
  | { ok: false; error: string };

/** Envoie un message vers une adresse externe (Gmail, Outlook…). */
export async function sendExternalMail(opts: {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<ExternalSendResult> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "Relais SMTP non configuré" };
  try {
    const from = process.env.SMTP_FROM || opts.from;
    await t.sendMail({
      from: opts.fromName ? `"${opts.fromName.replace(/"/g, "")}" <${from}>` : from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo || opts.from,
      headers: {
        "X-Mailer": "Ayeba Mail",
        "X-Ayeba-From": opts.from,
      },
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

/** Vérifie la connectivité du relais (diag back-office). */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { ok: false, error: "non configuré" };
  try {
    await t.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "échec" };
  }
}
