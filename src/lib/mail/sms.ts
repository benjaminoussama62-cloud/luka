/**
 * Ayeba Mail — envoi SMS réel.
 * Fournisseurs : Africa's Talking (recommandé RDC) puis Twilio.
 * Sans provider configuré : le code est renvoyé à l'API en mode développement
 * uniquement — jamais présenté comme un envoi réel.
 */

type SmsResult = { ok: true; provider: string } | { ok: false; error: string };

async function sendViaAfricasTalking(to: string, message: string): Promise<SmsResult> {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) return { ok: false, error: "AT not configured" };
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  const res = await fetch(
    username === "sandbox"
      ? "https://api.sandbox.africastalking.com/version1/messaging"
      : "https://api.africastalking.com/version1/messaging",
    {
      method: "POST",
      headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    },
  );
  const data = (await res.json().catch(() => null)) as {
    SMSMessageData?: { Recipients?: { status: string }[]; Message?: string };
  } | null;
  const status = data?.SMSMessageData?.Recipients?.[0]?.status;
  if (res.ok && status && /success/i.test(status)) return { ok: true, provider: "africastalking" };
  return { ok: false, error: data?.SMSMessageData?.Message || `AT ${res.status}` };
}

async function sendViaTwilio(to: string, message: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return { ok: false, error: "Twilio not configured" };
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: message }),
  });
  if (res.ok) return { ok: true, provider: "twilio" };
  const data = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, error: data?.message || `Twilio ${res.status}` };
}

/** Envoie un SMS via le premier provider configuré. */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const at = await sendViaAfricasTalking(to, message);
  if (at.ok) return at;
  const tw = await sendViaTwilio(to, message);
  if (tw.ok) return tw;
  return { ok: false, error: at.error === "AT not configured" ? tw.error : `${at.error} | ${tw.error}` };
}

export function smsConfigured(): boolean {
  return !!(
    (process.env.AT_USERNAME && process.env.AT_API_KEY) ||
    (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM)
  );
}
