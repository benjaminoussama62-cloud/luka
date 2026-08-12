import { resolveTxt } from "dns/promises";
import type { StudioSite } from "./types";
import { markSiteVerified } from "./sites";

export type VerifyMethod = "meta" | "file" | "dns";

export type VerifyResult = {
  ok: boolean;
  method?: VerifyMethod;
  detail: string;
};

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "AyebaStudioBot/1.0 (+https://ayeba.app/studio)",
        Accept: "text/html,text/plain,*/*",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function htmlHasMeta(html: string, token: string): boolean {
  const re = /<meta[^>]+name=["']ayeba-studio-verification["'][^>]*>/gi;
  const matches = html.match(re) || [];
  for (const tag of matches) {
    if (tag.includes(token)) return true;
  }
  // content before name also ok
  const re2 =
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']ayeba-studio-verification["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re2.exec(html))) {
    if (m[1] === token) return true;
  }
  return false;
}

export function verificationInstructions(site: StudioSite) {
  const token = site.verifyToken;
  return {
    meta: {
      label: "Balise meta HTML",
      html: `<meta name="ayeba-studio-verification" content="${token}" />`,
      hint: "Placez cette balise dans le <head> de la page d’accueil, puis vérifiez.",
    },
    file: {
      label: "Fichier à la racine",
      path: `/ayeba-studio-verification.txt`,
      body: token,
      hint: `Créez https://${site.domain}/ayeba-studio-verification.txt contenant uniquement le jeton.`,
    },
    dns: {
      label: "Enregistrement DNS TXT",
      host: `@ ou ${site.domain}`,
      value: `ayeba-studio=${token}`,
      hint: "Ajoutez un TXT DNS, attendez la propagation, puis vérifiez.",
    },
  };
}

export async function verifySiteOwnership(site: StudioSite): Promise<VerifyResult> {
  if (site.status === "verified") {
    return { ok: true, detail: "Site déjà vérifié." };
  }

  const token = site.verifyToken;
  const origins = [`https://${site.domain}`, `https://www.${site.domain}`, `http://${site.domain}`];

  // 1) Meta on homepage
  for (const origin of origins) {
    const html = await fetchText(`${origin}/`);
    if (html && htmlHasMeta(html, token)) {
      markSiteVerified(site.id);
      return { ok: true, method: "meta", detail: `Propriété confirmée via balise meta (${origin}).` };
    }
  }

  // 2) Verification file
  for (const origin of origins) {
    const body = await fetchText(`${origin}/ayeba-studio-verification.txt`);
    if (body && body.trim().includes(token)) {
      markSiteVerified(site.id);
      return { ok: true, method: "file", detail: `Propriété confirmée via fichier (${origin}).` };
    }
  }

  // 3) DNS TXT
  try {
    const records = await resolveTxt(site.domain);
    const flat = records.map((parts) => parts.join(""));
    if (flat.some((r) => r.includes(`ayeba-studio=${token}`) || r.trim() === token)) {
      markSiteVerified(site.id);
      return { ok: true, method: "dns", detail: "Propriété confirmée via DNS TXT." };
    }
  } catch {
    /* DNS may fail / not configured */
  }

  return {
    ok: false,
    detail:
      "Jeton introuvable. Ajoutez la balise meta, le fichier de vérification, ou le TXT DNS, puis réessayez.",
  };
}
