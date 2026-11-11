/**
 * Ayeba Mail Services — moteur de templates transactionnels.
 *
 * HTML « bulletproof » : tables imbriquées + styles 100 % inline — le seul
 * markup qui survive à Outlook desktop, Gmail mobile et les webmails.
 * Chaque type a une version texte (multipart/alternative) — exigence des
 * filtres anti-spam et accessibilité.
 */

export type TxLocale = "fr" | "en" | "ln" | "sw";
export type TxApp = "ayeba" | "tala" | "sombateka" | "omega" | "mbongo" | "mail";
export type TxType =
  | "otp" | "verify" | "reset" | "receipt" | "invoice"
  | "alert" | "welcome" | "notification";

export type TxMessage = { subject: string; text: string; html: string };

const BRAND: Record<TxApp, { name: string; color: string; domain: string; tagline: Record<TxLocale, string> }> = {
  ayeba:     { name: "Ayeba",     color: "#0A66FF", domain: "ayeba.app",     tagline: { fr: "L'écosystème numérique africain", en: "The African digital ecosystem", ln: "Ecosysteme ya Afrique", sw: "Mfumo wa kidijitali wa Afrika" } },
  mail:      { name: "Ayeba Mail", color: "#0A66FF", domain: "ayeba.app",     tagline: { fr: "Votre coffre de bout en bout", en: "Your end-to-end vault", ln: "Coffre nayo", sw: "Kisanduku chako" } },
  tala:      { name: "TALA",      color: "#7C3AED", domain: "to-tala.com",   tagline: { fr: "Regardez. Créez. Vivez.", en: "Watch. Create. Live.", ln: "TALA", sw: "TALA" } },
  sombateka: { name: "SombaTeka", color: "#2563EB", domain: "sombateka.com", tagline: { fr: "Le marché qui vous ressemble", en: "The marketplace made for you", ln: "SombaTeka", sw: "SombaTeka" } },
  omega:     { name: "OMEGA",     color: "#111827", domain: "omega-web.org", tagline: { fr: "Lisez ce qui vous ressemble", en: "Read what feels like you", ln: "OMEGA", sw: "OMEGA" } },
  mbongo:    { name: "Mbongo",    color: "#047857", domain: "ayeba.app",     tagline: { fr: "Votre argent, maîtrisé", en: "Your money, mastered", ln: "Mbongo", sw: "Mbongo" } },
};

type Strings = {
  hi: (name: string) => string;
  codeIntro: string; codeNote: (ttl: string) => string;
  context: string; notYou: string; secureBtn: string;
  verifyIntro: string; verifyBtn: string;
  resetIntro: string; resetBtn: string;
  receiptTitle: string; invoiceTitle: string;
  alertTitle: string;
  welcomeTitle: (name: string) => string;
  ignore: string; auto: string; footer: (domain: string) => string;
  amount: string; ref: string; to: string; plan: string;
};

const S: Record<TxLocale, Strings> = {
  fr: {
    hi: (n) => `Bonjour${n ? ` ${n}` : ""},`,
    codeIntro: "Voici votre code de vérification :",
    codeNote: (ttl) => `Ce code est valable ${ttl}. Ne le partagez avec personne — nos équipes ne vous le demanderont jamais.`,
    context: "Demande effectuée",
    notYou: "Ce n'était pas vous ? Sécurisez votre compte immédiatement.",
    secureBtn: "Sécuriser mon compte",
    verifyIntro: "Confirmez votre adresse pour activer votre compte :",
    verifyBtn: "Confirmer mon adresse",
    resetIntro: "Une demande de réinitialisation de mot de passe a été faite pour votre compte :",
    resetBtn: "Réinitialiser mon mot de passe",
    receiptTitle: "Reçu de transaction",
    invoiceTitle: "Votre facture",
    alertTitle: "Alerte de sécurité",
    welcomeTitle: (n) => `Bienvenue${n ? ` ${n}` : ""} !`,
    ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
    auto: "Cet email a été envoyé automatiquement — merci de ne pas y répondre directement.",
    footer: (d) => `© ${new Date().getFullYear()} ${d} — Tous droits réservés.`,
    amount: "Montant", ref: "Référence", to: "Destinataire", plan: "Formule",
  },
  en: {
    hi: (n) => `Hello${n ? ` ${n}` : ""},`,
    codeIntro: "Here is your verification code:",
    codeNote: (ttl) => `This code is valid for ${ttl}. Never share it — our teams will never ask for it.`,
    context: "Request made",
    notYou: "Wasn't you? Secure your account immediately.",
    secureBtn: "Secure my account",
    verifyIntro: "Confirm your address to activate your account:",
    verifyBtn: "Confirm my address",
    resetIntro: "A password reset was requested for your account:",
    resetBtn: "Reset my password",
    receiptTitle: "Transaction receipt",
    invoiceTitle: "Your invoice",
    alertTitle: "Security alert",
    welcomeTitle: (n) => `Welcome${n ? ` ${n}` : ""}!`,
    ignore: "If you did not make this request, simply ignore this email.",
    auto: "This email was sent automatically — please do not reply directly.",
    footer: (d) => `© ${new Date().getFullYear()} ${d} — All rights reserved.`,
    amount: "Amount", ref: "Reference", to: "Recipient", plan: "Plan",
  },
  ln: {
    hi: (n) => `Mbote${n ? ` ${n}` : ""},`,
    codeIntro: "Code ya vérification na yo :",
    codeNote: (ttl) => `Code oyo ezali valable ${ttl}. Kabola yango na moto te — biso tosɛngaka yango ata moke te.`,
    context: "Demande esalemaki",
    notYou: "Ezalaki yo te ? Batela compte na yo sika sika.",
    secureBtn: "Batela compte na nga",
    verifyIntro: "Confirmá adresse na yo mpo na ko activer compte na yo :",
    verifyBtn: "Nakonfirme adresse na nga",
    resetIntro: "Demande ya réinitialisation ya mot de passe esalemaki mpo na compte na yo :",
    resetBtn: "Nabongola mot de passe na nga",
    receiptTitle: "Reçu ya transaction",
    invoiceTitle: "Facture na yo",
    alertTitle: "Alerte ya sécurité",
    welcomeTitle: (n) => `Boyeyi malamu${n ? ` ${n}` : ""} !`,
    ignore: "Soki ezalaki yo te, tika email oyo kaka.",
    auto: "Email oyo etindaki automatiquement — yànula yango te.",
    footer: (d) => `© ${new Date().getFullYear()} ${d}`,
    amount: "Montant", ref: "Référence", to: "Mpo na", plan: "Formule",
  },
  sw: {
    hi: (n) => `Habari${n ? ` ${n}` : ""},`,
    codeIntro: "Hiki hapa nambari yako ya uthibitishaji:",
    codeNote: (ttl) => `Nambari hii ni halali kwa ${ttl}. Usishiriki na mtu yeyote — timu zetu hazitaiomba kamwe.`,
    context: "Ombi lifanywa",
    notYou: "Si wewe? Linda akaunti yako mara moja.",
    secureBtn: "Linda akaunti yangu",
    verifyIntro: "Thibitisha anwani yako ili kuwash akaunti yako:",
    verifyBtn: "Thibitisha anwani yangu",
    resetIntro: "Ombi la kuweka upya nenosiri lifanywa kwa akaunti yako:",
    resetBtn: "Weka upya nenosiri langu",
    receiptTitle: "Risiti ya muamala",
    invoiceTitle: "Ankara yako",
    alertTitle: "Tahadhari ya usalama",
    welcomeTitle: (n) => `Karibu${n ? ` ${n}` : ""}!`,
    ignore: "Ikiwa hukuomba hili, puuza tu barua pepe hii.",
    auto: "Barua pepe hii ilitumwa kiotomatiki — usijibu moja kwa moja.",
    footer: (d) => `© ${new Date().getFullYear()} ${d}`,
    amount: "Kiasi", ref: "Rejea", to: "Kwa", plan: "Mpango",
  },
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const cell = (content: string, style = "") => `<td style="${style}">${content}</td>`;
const row = (content: string) => `<tr>${content}</tr>`;
// href : échappé + limité à http(s)/mailto — jamais de javascript: ni
// d'injection d'attribut depuis `data`.
const safeHref = (href: string) =>
  /^(https?:|mailto:)/i.test(href) ? esc(href) : "#";
const btn = (href: string, label: string, color: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto"><tr><td align="center" bgcolor="${color}" style="border-radius:8px"><a href="${safeHref(href)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a></td></tr></table>`;

function layout(app: TxApp, locale: TxLocale, inner: string): string {
  const b = BRAND[app];
  const s = S[locale];
  return `<!DOCTYPE html>
<html lang="${locale}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(b.name)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
<div style="display:none;max-height:0;overflow:hidden">${esc(b.name)} — ${esc(b.tagline[locale])}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%">
${row(cell(`<span style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:${b.color};letter-spacing:.04em">${esc(b.name.toUpperCase())}</span>`, "padding:0 8px 20px"))}
${row(cell(`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-radius:14px;border:1px solid #e5e7eb"><tr><td style="padding:36px 32px">${inner}</td></tr></table>`))}
${row(cell(`<p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9ca3af;margin:20px 8px 0;line-height:1.6">${esc(s.auto)}<br>${esc(s.footer(b.domain))}</p>`))}
</table>
</td></tr>
</table>
</body>
</html>`;
}

const p = (html: string, style = "") =>
  `<p style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#1f2937;margin:0 0 16px;${style}">${html}</p>`;

const codeBlock = (code: string, color: string) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px"><tr><td bgcolor="#f9fafb" style="border:2px dashed ${color};border-radius:10px;padding:16px 34px"><span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:6px;color:${color}">${esc(code)}</span></td></tr></table>`;

const contextLine = (s: Strings, data: Record<string, string>) => {
  const bits = [data.ip && `IP ${esc(data.ip)}`, data.device && esc(data.device), data.place && esc(data.place)].filter(Boolean);
  if (!bits.length) return "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fffbeb" style="border:1px solid #fde68a;border-radius:8px;margin:20px 0"><tr><td style="padding:12px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#92400e">⏱ ${esc(s.context)} — ${bits.join(" · ")}</td></tr></table>`;
};

const notYou = (s: Strings, app: TxApp, data: Record<string, string>) => {
  const url = data.secureUrl || `https://${BRAND[app].domain}/compte/securite`;
  return `${p(`<span style="color:#b91c1c;font-weight:600">${esc(s.notYou)}</span>`)}${btn(url, s.secureBtn, "#1f2937")}`;
};

/**
 * Rend un message transactionnel complet.
 * `data` : champs propres au type (code, url, name, amount, ref, ip, device, place…).
 */
export function renderTx(app: TxApp, type: TxType, locale: TxLocale, data: Record<string, string>): TxMessage {
  const b = BRAND[app] ?? BRAND.ayeba;
  const s = S[locale] ?? S.fr;
  const name = data.name || "";
  const hi = p(esc(s.hi(name)), "font-size:17px;font-weight:600");

  switch (type) {
    case "otp": {
      const subject = `${b.name} — ${locale === "en" ? "your code" : "votre code"} ${data.code || ""}`.trim();
      const inner = `${hi}${p(esc(s.codeIntro))}${codeBlock(data.code || "······", b.color)}${p(esc(s.codeNote(data.ttl || "10 minutes")))}${contextLine(s, data)}${p(`<span style="color:#6b7280;font-size:13px">${esc(s.ignore)}</span>`)}`;
      const text = `${s.hi(name)}\n\n${s.codeIntro} ${data.code}\n\n${s.codeNote(data.ttl || "10 minutes")}\n\n${s.ignore}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "verify": {
      const subject = locale === "en" ? `${b.name} — confirm your address` : `${b.name} — confirmez votre adresse`;
      const inner = `${hi}${p(esc(s.verifyIntro))}${btn(data.url || "#", s.verifyBtn, b.color)}${contextLine(s, data)}${p(`<span style="color:#6b7280;font-size:13px">${esc(s.ignore)}</span>`)}`;
      const text = `${s.hi(name)}\n\n${s.verifyIntro}\n${data.url}\n\n${s.ignore}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "reset": {
      const subject = locale === "en" ? `${b.name} — reset your password` : `${b.name} — réinitialisation du mot de passe`;
      const inner = `${hi}${p(esc(s.resetIntro))}${btn(data.url || "#", s.resetBtn, b.color)}${contextLine(s, data)}${notYou(s, app, data)}`;
      const text = `${s.hi(name)}\n\n${s.resetIntro}\n${data.url}\n\n${s.notYou}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "receipt":
    case "invoice": {
      const title = type === "receipt" ? s.receiptTitle : s.invoiceTitle;
      const subject = `${b.name} — ${title}${data.ref ? ` · ${data.ref}` : ""}`;
      const rows = [
        [s.amount, data.amount],
        [s.plan, data.plan],
        [s.ref, data.ref],
        [s.to, data.counterparty],
      ].filter(([, v]) => v)
        .map(([k, v]) => row(cell(`<span style="font-family:Arial;font-size:13px;color:#6b7280">${esc(k!)}</span>`, "padding:9px 0;border-bottom:1px solid #f3f4f6") + cell(`<span style="font-family:Arial;font-size:14px;font-weight:600;color:#111827;text-align:right">${esc(v!)}</span>`, "padding:9px 0;border-bottom:1px solid #f3f4f6;text-align:right")))
        .join("");
      const inner = `${hi}${p(`<b>${esc(title)}</b>`)}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:12px 0 20px">${rows}</table>${data.url ? btn(data.url, locale === "en" ? "View details" : "Voir le détail", b.color) : ""}`;
      const text = `${s.hi(name)}\n\n${title}\n${data.amount ? `${s.amount}: ${data.amount}\n` : ""}${data.ref ? `${s.ref}: ${data.ref}\n` : ""}\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "alert": {
      const subject = `${b.name} — ${s.alertTitle}`;
      const inner = `${hi}${p(`<b style="color:#b91c1c">${esc(data.title || s.alertTitle)}</b>`)}${p(esc(data.detail || ""))}${contextLine(s, data)}${notYou(s, app, data)}`;
      const text = `${s.hi(name)}\n\n${s.alertTitle}\n${data.detail || ""}\n\n${s.notYou}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "welcome": {
      const subject = s.welcomeTitle(name).replace(" !", ` — ${b.name}!`);
      const inner = `${p(`<span style="font-size:20px;font-weight:700;color:${b.color}">${esc(s.welcomeTitle(name))}</span>`)}${p(esc(data.intro || b.tagline[locale]))}${data.url ? btn(data.url, locale === "en" ? "Get started" : "Commencer", b.color) : ""}`;
      const text = `${s.welcomeTitle(name)}\n\n${data.intro || b.tagline[locale]}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
    case "notification":
    default: {
      const subject = data.subject || `${b.name} — notification`;
      const inner = `${hi}${p(esc(data.detail || data.subject || ""))}${data.url ? btn(data.url, data.cta || (locale === "en" ? "View" : "Voir"), b.color) : ""}`;
      const text = `${s.hi(name)}\n\n${data.detail || data.subject || ""}\n\n— ${b.name}`;
      return { subject, text, html: layout(app, locale, inner) };
    }
  }
}
