"use client";

import { useEffect, useMemo, useState } from "react";
import { DEEP_RESEARCH_STEPS } from "@/lib/search-engine";
import { useAyeba } from "@/lib/store";
import type { DeepResearchReport, DeepResearchStep } from "@/lib/types";

function buildReport(query: string): DeepResearchReport {
  return {
    title: `Rapport de Recherche Profonde — ${query}`,
    abstract:
      "Produit par Ayeba Recherche Profonde : balayage de l'index mondial, croisement des sources RDC/Afrique si pertinent, exclusion du spam IA SEO.",
    sections: [
      {
        heading: "1. Couverture mondiale",
        body: `La requête « ${query} » a d'abord été résolue sur l'index mondial. Le boost RDC n'intervient qu'en signal complémentaire.`,
        citations: ["wikipedia.org", "nature.com", "imf.org"],
      },
      {
        heading: "2. Angle RDC / Afrique",
        body: "Quand le sujet touche la région, Ayeba remonte .cd et institutions locales — en plus des sources internationales.",
        citations: ["bcc.cd", "unikin.ac.cd", "radiookapi.net"],
      },
      {
        heading: "3. Risques & conflits d'intérêts",
        body: "Les résultats médicaux/financiers à conflit détecté sont signalés explicitement.",
        citations: ["pharmaglobal.example", "atlas-finance.example"],
      },
      {
        heading: "4. Recommandations",
        body: "Autorités mondiales d'abord, puis sources terrain / gov RDC. Anti-bulle de filtre sur les sujets politiques.",
        citations: ["reuters.com", "worldbank.org"],
      },
    ],
    sources: [
      { title: "Wikipedia", url: "https://en.wikipedia.org", credibility: 96 },
      { title: "IMF WEO", url: "https://www.imf.org", credibility: 95 },
      { title: "BCC", url: "https://www.bcc.cd", credibility: 94 },
      { title: "Radio Okapi", url: "https://www.radiookapi.net", credibility: 86 },
    ],
    generatedAt: new Date().toISOString(),
  };
}

export function DeepResearchPanel() {
  const { deepResearchOpen, setDeepResearchOpen, query, response } = useAyeba();
  const [steps, setSteps] = useState<DeepResearchStep[]>([]);
  const [report, setReport] = useState<DeepResearchReport | null>(null);
  const [running, setRunning] = useState(false);
  const q = query || response?.query || "world";

  useEffect(() => {
    if (!deepResearchOpen) return;
    setReport(null);
    setRunning(true);
    setSteps(
      DEEP_RESEARCH_STEPS.map((s, i) => ({
        id: s.id,
        label: s.label,
        status: i === 0 ? "running" : "pending",
      })),
    );

    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setSteps((prev) =>
        prev.map((step, idx) => {
          if (idx < i) return { ...step, status: "done" };
          if (idx === i) return { ...step, status: "running" };
          return step;
        }),
      );
      if (i >= DEEP_RESEARCH_STEPS.length) {
        window.clearInterval(timer);
        setReport(buildReport(q));
        setRunning(false);
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [deepResearchOpen, q]);

  const progress = useMemo(() => {
    if (!steps.length) return 0;
    return Math.round((steps.filter((s) => s.status === "done").length / steps.length) * 100);
  }, [steps]);

  if (!deepResearchOpen) return null;

  function downloadReport() {
    if (!report) return;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><title>${report.title}</title>
<style>body{font-family:system-ui;max-width:720px;margin:40px auto;line-height:1.6;background:#09090b;color:#fff}a{color:#93c5fd}.meta{color:#a1a1aa}</style></head><body>
<h1>${report.title}</h1><p class="meta">Ayeba · ${report.generatedAt}</p>
<p>${report.abstract}</p>
${report.sections.map((s) => `<h2>${s.heading}</h2><p>${s.body}</p><p class="meta">${s.citations.join(", ")}</p>`).join("")}
<h2>Sources</h2><ul>${report.sources.map((s) => `<li>[${s.credibility}] <a href="${s.url}">${s.title}</a></li>`).join("")}</ul>
<script>setTimeout(()=>window.print(),400)</script></body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ayeba-rapport-${q.replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ayeba-overlay ayeba-overlay-bottom">
      <div className="ayeba-modal max-w-3xl">
        <header className="ayeba-modal-header">
          <div>
            <p className="ayeba-kicker ayeba-kicker-accent">Recherche Profonde</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
              Rapport autonome sourcé
            </h2>
          </div>
          <button type="button" onClick={() => setDeepResearchOpen(false)} className="ayeba-ghost px-3 py-1.5 text-sm">
            Fermer
          </button>
        </header>

        <div className="ayeba-modal-body space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-xs text-[var(--ink-faint)]">
              <span>{running ? "Exploration…" : "Terminé"}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--gray-deep)]">
              <div
                className={`h-full rounded-full ${running ? "progress-shimmer" : "bg-gradient-to-r from-[var(--red)] to-[#9ca3af]"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ol className="space-y-3">
            {steps.map((step) => (
              <li key={step.id} className="flex items-start gap-3 text-sm text-white">
                <span
                  className={`mt-0.5 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold text-white ${
                    step.status === "done"
                      ? "bg-[var(--good)]"
                      : step.status === "running"
                        ? "animate-pulse-ring bg-[var(--red)]"
                        : "bg-[var(--gray-deep)]"
                  }`}
                >
                  {step.status === "done" ? "✓" : step.status === "running" ? "…" : ""}
                </span>
                <span className={step.status === "pending" ? "text-[var(--ink-faint)]" : ""}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          {report && (
            <article className="ayeba-panel animate-rise space-y-5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-[family-name:var(--font-display)] text-xl text-white">
                  {report.title}
                </h3>
                <button type="button" onClick={downloadReport} className="ayeba-cta px-4 py-2 text-sm">
                  Télécharger PDF
                </button>
              </div>
              <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{report.abstract}</p>
              {report.sections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h4 className="font-semibold text-white">{section.heading}</h4>
                  <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{section.body}</p>
                </section>
              ))}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
