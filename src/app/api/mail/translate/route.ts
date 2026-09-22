import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth-server";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const LANGS: Record<string, string> = {
  fr: "français",
  ln: "lingala",
  sw: "swahili",
  en: "anglais",
};

export async function POST(req: Request) {
  const user = await getSessionFromCookies();
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  if (!rateLimit(`mail-translate:${clientIp(req)}`, 40, 60_000)) return rateLimitResponse();

  const body = (await req.json().catch(() => null)) as
    | { text?: string; target?: string }
    | null;
  const text = String(body?.text || "").slice(0, 8_000);
  const target = LANGS[String(body?.target || "fr")];
  if (!text || !target) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY || process.env.AYEBA_LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Traduction indisponible — service LLM non configuré." },
      { status: 503 },
    );
  }
  const baseUrl = (process.env.AYEBA_LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AYEBA_LLM_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `Tu es le traducteur d'Ayeba Mail. Traduis fidèlement le message en ${target}. Conserve le sens exact, le ton et la mise en paragraphe. Réponds uniquement avec la traduction, sans commentaire.`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const translation = data.choices?.[0]?.message?.content?.trim();
    if (!translation) throw new Error("empty");
    return NextResponse.json({ translation, target });
  } catch {
    return NextResponse.json({ error: "Traduction échouée — réessayez." }, { status: 502 });
  }
}
