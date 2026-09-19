"use client";

import { FormEvent, useState } from "react";

const REASONS = [
  "Informations inexactes",
  "Contenu non neutre / partisan",
  "Vandalisme",
  "Violation de droits d'auteur",
  "Contenu hors sujet (non RDC)",
  "Autre",
];

export function AyebiFlagModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    const res = await fetch(`/api/ayebi/articles/${slug}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, detail }),
    });
    setSending(false);
    if (!res.ok) {
      const d = (await res.json()) as { error?: string };
      setError(d.error ?? "Erreur.");
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="ayeba-panel w-full max-w-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-medium text-white">Signaler cet article</p>
          <button type="button" onClick={onClose} className="text-[var(--faint)] hover:text-white">✕</button>
        </div>

        {done ? (
          <div className="py-4 text-center">
            <p className="text-sm text-[var(--muted)]">Signalement envoyé. Merci pour votre contribution.</p>
            <button type="button" onClick={onClose} className="ayeba-pill mt-4 px-5 py-2 text-sm">Fermer</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Raison</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-white"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--faint)]">Détails (optionnel)</span>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                className="ayeba-glass w-full rounded-xl px-4 py-3 text-sm text-white"
                placeholder="Précisez le problème…"
              />
            </label>
            {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={sending} className="ayeba-pill px-5 py-2 text-sm">
                {sending ? "Envoi…" : "Signaler"}
              </button>
              <button type="button" onClick={onClose} className="ayeba-ghost px-5 py-2 text-sm">Annuler</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
