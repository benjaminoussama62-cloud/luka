"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AyebiMarkupText } from "@/components/ayebi/AyebiMarkupText";

type TalkMessage = { id: number; authorName: string; body: string; createdAt: string };

export function AyebiDiscussionClient({
  slug,
  title,
  initialMessages,
  canPost,
}: {
  slug: string;
  title: string;
  initialMessages: TalkMessage[];
  canPost: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch(`/api/ayebi/articles/${slug}/discussion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body }),
    });
    const data = (await res.json()) as { error?: string };
    setSending(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setMessages([
      ...messages,
      {
        id: Date.now(),
        authorName: "Vous",
        body,
        createdAt: new Date().toISOString(),
      },
    ]);
    setBody("");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={`/ayebi/${slug}`} className="ayeba-ghost px-3 py-1.5 text-xs">
          ← {title}
        </Link>
        <Link href={`/ayebi/${slug}/historique`} className="ayeba-ghost px-3 py-1.5 text-xs">
          Historique
        </Link>
      </div>

      <h1 className="font-[family-name:var(--font-display)] text-3xl text-white">Discussion</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Propositions d&apos;amélioration, sources, débat sur la fiche « {title} ».
      </p>

      <ul className="ayeba-panel mt-8 divide-y divide-[var(--line)]">
        {messages.length ? (
          messages.map((m) => (
            <li key={m.id} className="px-5 py-4">
              <p className="text-sm font-medium text-white">{m.authorName}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                <AyebiMarkupText text={m.body} />
              </p>
              <p className="mt-2 font-mono text-[10px] text-[var(--faint)]">
                {new Date(m.createdAt).toLocaleString("fr-FR")}
              </p>
            </li>
          ))
        ) : (
          <li className="px-5 py-8 text-center text-sm text-[var(--muted)]">
            Aucun message — ouvrez la discussion.
          </li>
        )}
      </ul>

      {canPost ? (
        <form onSubmit={onSubmit} className="ayeba-panel mt-6 p-5">
          <label className="block">
            <span className="mb-2 block text-xs text-[var(--faint)]">Votre message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              className="ayeba-glass w-full rounded-xl px-4 py-3 text-sm text-white"
              placeholder="Proposez une correction, citez une source [ref:url|Titre]…"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-[var(--bad)]">{error}</p> : null}
          <button type="submit" disabled={sending} className="ayeba-pill mt-4 px-5 py-2 text-sm">
            {sending ? "Envoi…" : "Publier"}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href={`/ayebi/connexion?redirect=/ayebi/${slug}/discussion`} className="text-[var(--accent)]">
            Connectez-vous
          </Link>{" "}
          pour participer.
        </p>
      )}
    </div>
  );
}
