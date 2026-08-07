import type { SearchResult } from "./types";

type Source = { title: string; url: string; domain: string; snippet: string };

export async function synthesizeWithLlm(
  query: string,
  results: SearchResult[],
  knowledgeSummary?: string,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AYEBA_LLM_API_KEY;
  if (!apiKey) return null;

  const baseUrl =
    process.env.AYEBA_LLM_BASE_URL?.replace(/\/$/, "") ||
    "https://api.openai.com/v1";
  const model = process.env.AYEBA_LLM_MODEL || "gpt-4o-mini";

  const sources: Source[] = results.slice(0, 8).map((r) => ({
    title: r.title,
    url: r.url,
    domain: r.domain,
    snippet: r.snippet.slice(0, 320),
  }));

  const localFirst = [...sources].sort((a, b) => {
    const la = a.domain.endsWith(".cd") ? 1 : 0;
    const lb = b.domain.endsWith(".cd") ? 1 : 0;
    return lb - la;
  });

  const system = `Tu es le moteur de synthèse Ayeba. Règles strictes:
- Réponds en français, 3 à 5 phrases denses, factuelles.
- Priorise les sources locales (.cd, institutions, presse du pays) SANS nommer explicitement "RDC" ou "République démocratique du Congo" dans ta réponse — laisse le contenu parler.
- Cite implicitement les domaines (ex. "selon bcc.cd…") quand pertinent.
- Pas de formules creuses, pas de "En tant qu'IA".
- Si les sources sont faibles, dis-le clairement.`;

  const userContent = JSON.stringify(
    {
      query,
      knowledge: knowledgeSummary?.slice(0, 600) ?? null,
      sources: localFirst,
    },
    null,
    2,
  );

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 420,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Synthétise cette recherche à partir des sources JSON:\n${userContent}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(2800),
    });

    if (!res.ok) {
      console.error("LLM error", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 40 ? text : null;
  } catch (e) {
    console.error("LLM fetch failed", e);
    return null;
  }
}
