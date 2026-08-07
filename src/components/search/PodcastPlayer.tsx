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
    <div className="ayeba-overlay ayeba-overlay-bottom">
      <div className="ayeba-modal max-w-2xl">
        <header className="ayeba-modal-header">
          <div>
            <p className="ayeba-kicker ayeba-kicker-accent">Podcast</p>
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
            className="ayeba-ghost px-3 py-1.5 text-sm"
          >
            Fermer
          </button>
        </header>

        <div className="ayeba-modal-body space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlaying(true)} className="ayeba-cta px-4 py-2 text-sm">
              {playing ? "En lecture…" : "Écouter"}
            </button>
            <button
              type="button"
              onClick={() => {
                window.speechSynthesis.cancel();
                setPlaying(false);
              }}
              className="ayeba-ghost px-4 py-2 text-sm"
            >
              Pause
            </button>
          </div>

          <ul className="space-y-3">
            {segments.map((seg, i) => (
              <li
                key={i}
                className={`ayeba-panel px-4 py-3 text-sm leading-relaxed ${
                  i === index && playing ? "border-[var(--line-bright)]" : ""
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
