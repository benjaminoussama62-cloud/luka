import { meaningfulTokens, normalizeQueryText, tokenMatchesInHay } from "./search-relevance";
import type { InstantAnswer, KnowledgePanel } from "./types";
import type { QuestionType } from "./query-intent";

/**
 * Réponse factuelle à une question — extraction réelle depuis Wikipédia.
 * Chaîne : opensearch (résout translittérations « putin »→« Poutine »,
 * sigles « bcdc »→« Banque commerciale du Congo ») → REST summary → extrait.
 * Aucune donnée inventée : la réponse est le texte réel de l'article trouvé.
 */

export type WikiAnswer = {
  title: string;
  extract: string;
  url: string;
  description?: string;
  image?: string;
  lang: "fr" | "en";
};

const UA = { "User-Agent": "Ayeba/1.0 (https://ayeba.app; search answers)" };
const FETCH_MS = 2200;

type WikiSummary = {
  title?: string;
  extract?: string;
  description?: string;
  type?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source?: string };
};

/** Vrai si l'extrait parle bien du sujet demandé — évite les homonymies. */
function extractMatchesSubject(extract: string, title: string, subject: string): boolean {
  const tokens = meaningfulTokens(subject);
  if (!tokens.length) return true;
  const hay = normalizeQueryText(`${title} ${extract.slice(0, 400)}`);
  let matched = 0;
  for (const t of tokens) {
    if (tokenMatchesInHay(t, hay)) matched++;
  }
  // Un sujet multi-mots doit être recouvert à moitié au moins ; un seul mot doit matcher.
  return tokens.length === 1 ? matched >= 1 : matched >= Math.ceil(tokens.length / 2);
}

export async function fetchWikiAnswer(subject: string): Promise<WikiAnswer | undefined> {
  for (const lang of ["fr", "en"] as const) {
    try {
      const open = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(subject)}&limit=4&namespace=0&format=json&origin=*`,
        { signal: AbortSignal.timeout(FETCH_MS), headers: UA, next: { revalidate: 600 } },
      );
      if (!open.ok) continue;
      const data = (await open.json()) as [string, string[], string[], string[]];
      const titles = data[1] ?? [];

      for (const title of titles.slice(0, 2)) {
        try {
          const res = await fetch(
            `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
            { signal: AbortSignal.timeout(FETCH_MS), headers: UA, next: { revalidate: 600 } },
          );
          if (!res.ok) continue;
          const s = (await res.json()) as WikiSummary;
          if (!s.extract || s.extract.length < 60 || s.type === "disambiguation") continue;
          if (!extractMatchesSubject(s.extract, s.title ?? title, subject)) continue;
          return {
            title: s.title ?? title,
            extract: s.extract,
            url:
              s.content_urls?.desktop?.page ??
              `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
            description: s.description,
            image: s.thumbnail?.source,
            lang,
          };
        } catch {
          /* titre suivant */
        }
      }
    } catch {
      /* langue suivante */
    }
  }
  return undefined;
}

/** Premières phrases d'un extrait — la réponse directe affichée en carte. */
export function firstSentences(text: string, max = 2, cap = 420): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?]+[.!?]+/g) ?? [clean];
  let out = "";
  for (const p of parts.slice(0, max)) {
    if (out.length + p.length > cap) break;
    out += p;
  }
  if (!out) out = clean.slice(0, cap);
  return out.trim();
}

const QTYPE_LABEL: Record<QuestionType, string> = {
  who: "Identité",
  where: "Localisation",
  what: "Réponse",
  when: "Réponse",
  which: "Réponse",
  howmany: "Chiffre",
};

export function wikiAnswerToInstant(answer: WikiAnswer, qtype: QuestionType): InstantAnswer {
  return {
    kind: "answer",
    title: answer.title,
    lines: [{ label: QTYPE_LABEL[qtype], value: firstSentences(answer.extract, 2) }],
    footnote: `Source : Wikipédia ${answer.lang.toUpperCase()} — extrait réel · ${answer.url}`,
  };
}

export function wikiAnswerToPanel(answer: WikiAnswer): KnowledgePanel {
  return {
    title: answer.title,
    subtitle: answer.description ?? `Wikipédia (${answer.lang})`,
    summary: answer.extract,
    facts: [
      { label: "Source", value: `Wikipédia ${answer.lang.toUpperCase()}` },
      { label: "Type", value: "Encyclopédie" },
      { label: "Lien", value: answer.url },
    ],
    sources: [`${answer.lang}.wikipedia.org`],
    image: answer.image,
  };
}
