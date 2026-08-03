"use client";

import { useEffect, useState } from "react";
import { useAyeba } from "@/lib/store";

export function CodeExecutor() {
  const { codeOpen, setCodeOpen, response } = useAyeba();
  const initial = response?.code;
  const [code, setCode] = useState(initial?.code ?? "");
  const [output, setOutput] = useState(initial?.output ?? "");
  const [error, setError] = useState<string | undefined>(initial?.error);
  const [verified, setVerified] = useState(Boolean(initial?.verified));

  useEffect(() => {
    if (codeOpen && initial) {
      setCode(initial.code);
      setOutput(initial.output);
      setError(initial.error);
      setVerified(initial.verified);
    }
  }, [codeOpen, initial]);

  if (!codeOpen) return null;

  function run() {
    try {
      const logs: string[] = [];
      const consoleProxy = {
        log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      };
      const fn = new Function("console", code);
      fn(consoleProxy);
      setOutput(logs.join("\n") || "(aucune sortie)");
      setError(undefined);
      setVerified(true);
    } catch (e) {
      setVerified(false);
      setError(e instanceof Error ? e.message : "Erreur d'exécution");
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <div className="max-h-[92dvh] w-full max-w-4xl overflow-auto rounded-3xl border border-[var(--line)] bg-[#121216] shadow-[var(--shadow)]">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[#121216]/95 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--red-hot)]">
              Code exécutable
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Réponse vérifiée
            </h2>
          </div>
          <button type="button" onClick={() => setCodeOpen(false)} className="ayeba-chip px-3 py-1.5 text-sm">
            Fermer
          </button>
        </header>

        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="min-h-[280px] w-full rounded-2xl border border-[var(--line)] bg-black p-4 font-[family-name:var(--font-mono)] text-sm text-[#e4e4e7] outline-none focus:border-[var(--red)]"
            />
            <button
              type="button"
              onClick={run}
              className="rounded-full bg-gradient-to-r from-[var(--red)] to-[#6b7280] px-4 py-2 text-sm font-semibold text-white"
            >
              Exécuter
            </button>
          </div>
          <div className="space-y-3">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-black ${
                verified ? "bg-[var(--good)]" : "bg-[var(--bad)]"
              }`}
            >
              {verified ? "Vérifié" : "Non vérifié"}
            </span>
            <pre className="min-h-[280px] overflow-auto rounded-2xl border border-[var(--line)] bg-[rgba(0,0,0,0.45)] p-4 text-sm leading-relaxed text-[var(--ink-muted)]">
              {error ? `Erreur: ${error}` : output || "Lancez l'exécution."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
