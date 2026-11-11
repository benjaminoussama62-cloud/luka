/**
 * Ayeba Mbongo — notifications email réelles (relais SMTP existant).
 *
 * Chaque événement financier envoie un email : l'utilisateur voit
 * immédiatement si quelqu'un touche son argent. Un échec d'envoi ne bloque
 * JAMAIS l'opération (journalisé + audit) — mais rien n'est simulé : si le
 * relais n'est pas configuré, on le dit dans l'audit.
 */
import { findUserById } from "@/lib/db";
import { sendExternalMail } from "@/lib/mail/smtp";
import { minorToMajorString } from "./amounts";
import { audit } from "./core";

const FROM = "noreply@ayeba.app";

function fmt(amountMinor: number, currency: "USD" | "CDF"): string {
  return `${minorToMajorString(amountMinor, currency)} ${currency === "USD" ? "USD" : "FC"}`;
}

async function emailOf(userId: string): Promise<string | null> {
  try {
    const u = await findUserById(userId);
    return u?.email ?? null;
  } catch {
    return null;
  }
}

export async function notifyUser(
  userId: string,
  walletId: string,
  subject: string,
  lines: string[],
): Promise<void> {
  const to = await emailOf(userId);
  if (!to) return;
  const text = [
    "Bonjour,",
    "",
    ...lines,
    "",
    "Si vous n'êtes pas à l'origine de cette opération, changez immédiatement",
    "votre code PIN dans Ayeba Mbongo et contactez le support.",
    "",
    "— Ayeba Mbongo",
    "https://ayeba.app/mbongo",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#050507;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050507;padding:32px 16px">
    <tr><td align="center"><table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;background:#0d0f14;border:1px solid #1e2430;border-radius:16px;padding:32px 28px">
      <tr><td>
        <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#eafcff;letter-spacing:2px">AYEBA <span style="color:#e85d04">MBONGO</span></p>
        <p style="margin:0 0 20px;font-size:10px;color:#7df0ff;letter-spacing:3px">${subject.toUpperCase()}</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#c8d4dd">${lines
          .filter(Boolean)
          .map((l) => l === "" ? "<br>" : l.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
          .join("<br>")}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:6px 0 18px">
          <a href="https://ayeba.app/mbongo" style="display:inline-block;background:linear-gradient(90deg,#1a7f96,#e85d04);color:#fff;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:1px;padding:12px 30px;border-radius:12px">OUVRIR AYEBA MBONGO</a>
        </td></tr></table>
        <p style="margin:0;font-size:11px;line-height:1.5;color:#5a6674;border-top:1px solid #1e2430;padding-top:14px">
          Si vous n'êtes pas à l'origine de cette opération, changez immédiatement votre code PIN
          dans Ayeba Mbongo et contactez le support.
        </p>
      </td></tr>
    </table></td></tr></table>
  </body></html>`;
  const res = await sendExternalMail({
    from: FROM,
    fromName: "Ayeba Mbongo",
    to,
    subject: `Ayeba Mbongo — ${subject}`,
    text,
    html,
  });
  // Push instantané (FCM) — le mail reste la garantie si le push échoue.
  try {
    const { pushUser } = await import("./push");
    void pushUser(userId, `Ayeba Mbongo — ${subject}`, lines.filter(Boolean)[0] || subject);
  } catch { /* push best-effort */ }
  await audit(userId, walletId, "notify_email", { subject, to: to.replace(/(.{2}).*(@.*)/, "$1***$2"), sent: res.ok, error: res.ok ? undefined : res.error });
}

// ── Événements ──────────────────────────────────────────────────────

export function notifyTransferSent(
  userId: string,
  walletId: string,
  p: { amountMinor: number; currency: "USD" | "CDF"; to: string; txId: string },
) {
  void notifyUser(userId, walletId, "Transfert envoyé", [
    `Vous avez envoyé ${fmt(p.amountMinor, p.currency)} à ${p.to}.`,
    `Référence : ${p.txId}`,
  ]);
}

export function notifyTransferReceived(
  userId: string,
  walletId: string,
  p: { amountMinor: number; currency: "USD" | "CDF"; from: string; txId: string },
) {
  void notifyUser(userId, walletId, "Argent reçu", [
    `Vous avez reçu ${fmt(p.amountMinor, p.currency)} de ${p.from}.`,
    `Référence : ${p.txId}`,
  ]);
}

export function notifyDepositResult(
  userId: string,
  walletId: string,
  p: { amountMinor: number; currency: "USD" | "CDF"; ok: boolean; txId: string },
) {
  void notifyUser(
    userId,
    walletId,
    p.ok ? "Dépôt confirmé" : "Dépôt échoué",
    [
      p.ok
        ? `Votre dépôt de ${fmt(p.amountMinor, p.currency)} a été crédité sur votre portefeuille.`
        : `Votre dépôt de ${fmt(p.amountMinor, p.currency)} n'a pas abouti — aucun montant n'a été prélevé de votre solde.`,
      `Référence : ${p.txId}`,
    ],
  );
}

export function notifyWithdrawalResult(
  userId: string,
  walletId: string,
  p: { amountMinor: number; currency: "USD" | "CDF"; ok: boolean; txId: string },
) {
  void notifyUser(
    userId,
    walletId,
    p.ok ? "Retrait confirmé" : "Retrait échoué — recrédité",
    [
      p.ok
        ? `Votre retrait de ${fmt(p.amountMinor, p.currency)} a été envoyé sur votre Mobile Money.`
        : `Votre retrait de ${fmt(p.amountMinor, p.currency)} a échoué chez le partenaire — le montant a été recrédité intégralement.`,
      `Référence : ${p.txId}`,
    ],
  );
}

export function notifyPinChanged(userId: string, walletId: string, changed: boolean) {
  void notifyUser(userId, walletId, changed ? "Code PIN modifié" : "Code PIN créé", [
    changed
      ? "Votre code PIN Ayeba Mbongo vient d'être modifié."
      : "Votre code PIN Ayeba Mbongo vient d'être créé — il sera demandé pour chaque mouvement.",
    "Sans ce code, aucun envoi ni retrait n'est possible, même avec votre session.",
  ]);
}

export function notifyPinLocked(userId: string, walletId: string, retryAfterSec: number) {
  void notifyUser(userId, walletId, "Portefeuille temporairement verrouillé", [
    "Trop de tentatives de PIN incorrectes : votre portefeuille est verrouillé",
    `pendant ${Math.ceil(retryAfterSec / 60)} minute(s).`,
    "Si ce n'était pas vous, votre argent est en sécurité — changez votre mot de passe Ayeba puis votre PIN.",
  ]);
}

export function notifyWalletStatus(
  userId: string,
  walletId: string,
  status: "active" | "frozen" | "closed",
  reason?: string,
) {
  const labels = {
    active: "Votre portefeuille est de nouveau actif.",
    frozen: "Votre portefeuille a été gelé par précaution — aucun mouvement n'est possible.",
    closed: "Votre portefeuille a été fermé.",
  } as const;
  void notifyUser(userId, walletId, "Statut du portefeuille", [labels[status], ...(reason ? [`Motif : ${reason}`] : [])]);
}
