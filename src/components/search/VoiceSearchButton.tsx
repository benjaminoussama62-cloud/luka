"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: {
    AyebaBrowser?: {
      speechRecognize(o: { lang: string }): Promise<{ text: string }>;
      haptic?(o: { type: string }): Promise<void>;
    };
  };
};

const cap = () =>
  typeof window !== "undefined"
    ? (window as { Capacitor?: CapacitorGlobal }).Capacitor ?? null
    : null;

export function VoiceSearchButton({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const nativeSpeech = useRef<NonNullable<NonNullable<CapacitorGlobal["Plugins"]>["AyebaBrowser"]> | null>(null);

  useEffect(() => {
    // iOS natif : la Web Speech API est absente/inerte dans WKWebView —
    // on route vers SFSpeechRecognizer via le plugin AyebaBrowser.
    const native = cap()?.isNativePlatform?.() ? cap()?.Plugins?.AyebaBrowser : null;
    if (native?.speechRecognize) {
      nativeSpeech.current = native;
      const t = window.setTimeout(() => setSupported(true), 0);
      return () => window.clearTimeout(t);
    }

    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    const t = window.setTimeout(() => setSupported(Boolean(Ctor)), 0);
    if (!Ctor) return () => window.clearTimeout(t);

    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) onResult(text);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => window.clearTimeout(t);
  }, [onResult]);

  if (!supported) return null;

  async function toggle() {
    if (listening) {
      if (nativeSpeech.current) {
        setListening(false);
        return; // auto-stop natif (timeout 10s / fin de phrase)
      }
      const rec = recRef.current;
      if (!rec) return;
      rec.stop();
      setListening(false);
      return;
    }

    if (nativeSpeech.current) {
      setListening(true);
      void nativeSpeech.current.haptic?.({ type: "light" });
      try {
        const { text } = await nativeSpeech.current.speechRecognize({ lang: "fr-FR" });
        const clean = text?.trim();
        if (clean) onResult(clean);
      } catch {
        // Permission refusée ou reconnaissance indisponible — rien à faire.
      }
      setListening(false);
      return;
    }

    const rec = recRef.current;
    if (!rec) return;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className={`ayeba-ghost shrink-0 rounded-full p-2 ${listening ? "animate-pulse border-[var(--accent)] text-[var(--accent)]" : ""}`}
      aria-label="Recherche vocale"
      title="Recherche vocale"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.71V21h2v-3.29A7 7 0 0 0 19 11h-2z" />
      </svg>
    </button>
  );
}
