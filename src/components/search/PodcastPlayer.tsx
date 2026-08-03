"use client";

import { useEffect, useState } from "react";
import { useAyeba } from "@/lib/store";

export function PodcastPlayer() {
  const { podcastOpen, setPodcastOpen, response } = useAyeba();
  const segments = response?.podcast ?? [];
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!podcastOpen) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      setIndex(0);
    }
  }, [podcastOpen]);

  useEffect(() => {
    if (!playing || !podcastOpen || !segments[index]) return;
    window.speechSynthesis.cancel();
    const seg = segments[index];
    const u = new SpeechSynthesisUtterance(seg.text);
    u.lang = "fr-FR";
    u.rate = seg.speaker === "A" ? 1 : 0.95;
    u.pitch = seg.speaker === "A" ? 1 : 0.85;
    u.onend = () => {
      if (index < segments.length - 1) setIndex((i) => i + 1);
      else setPlaying(false);
    };
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [playing, index, podcastOpen, segments]);

  if (!podcastOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="w-full max-w-2xl overflow-auto rounded-3xl border border-[var(--line)] bg-[#121216] shadow-[var(--shadow)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--red-hot)]">
              Podcast
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Synthèse audio
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setPodcastOpen(false);
            }}
            className="ayeba-chip px-3 py-1.5 text-sm"
          >
            Fermer
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="rounded-full bg-gradient-to-r from-[var(--red)] to-[#6b7280] px-4 py-2 text-sm font-semibold text-white"
            >
              {playing ? "En lecture…" : "Écouter"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.speechSynthesis.cancel();
                setPlaying(false);
              }}
              className="ayeba-chip px-4 py-2 text-sm"
            >
              Pause
            </button>
          </div>

          <ul className="space-y-3">
            {segments.map((seg, i) => (
              <li
                key={i}
                className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
                  i === index && playing
                    ? "border-[rgba(239,35,60,0.55)] bg-[rgba(239,35,60,0.1)] text-white"
                    : "border-[var(--line)] text-[var(--ink-muted)]"
                }`}
              >
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                  Voix {seg.speaker}
                </span>
                {seg.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
