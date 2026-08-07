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
    <div className="ayeba-overlay ayeba-overlay-bottom">
      <div className="ayeba-modal max-w-4xl">
        <header className="ayeba-modal-header">
          <div>
            <p className="ayeba-kicker ayeba-kicker-accent">Code exécutable</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Réponse vérifiée
            </h2>
          </div>
          <button type="button" onClick={() => setCodeOpen(false)} className="ayeba-ghost px-3 py-1.5 text-sm">
            Fermer
          </button>
        </header>

        <div className="ayeba-modal-body grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="ayeba-glass min-h-[280px] w-full rounded-xl p-4 font-[family-name:var(--font-mono)] text-sm text-[#e4e4e7] outline-none focus:border-[var(--line-bright)]"
            />
            <button type="button" onClick={run} className="ayeba-cta px-4 py-2 text-sm">
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
            <pre className="ayeba-glass min-h-[280px] overflow-auto rounded-xl p-4 text-sm leading-relaxed text-[var(--muted)]">
              {error ? `Erreur: ${error}` : output || "Lancez l'exécution."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
